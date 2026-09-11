import assert from "node:assert/strict";
import test from "node:test";
import { Session } from "../src/game/session.ts";
import { LANES } from "../src/game/lanes.ts";
import { FACE_HALF, SKEE_CUPS } from "../src/game/layout3d.ts";
import {
  applyWide,
  ALLEY_PLAY,
  canCapture,
  classicHolesFor,
  isReachableX,
  makeTestBall,
  shouldSplitNow,
  simMatchesFace,
  SPLIT_Y,
  syncHoleLabels,
} from "../src/game/foundations.ts";

function roll(s, seconds, dt = 1 / 60) {
  const n = Math.ceil(seconds / dt);
  for (let i = 0; i < n; i++) s.stepRoll(dt, { left: false, right: false, up: false });
}

function playClassic() {
  const s = new Session();
  s.startCarnival();
  s.readyThrow();
  return s;
}

test("central 50 and both corner 100s sit inside the legal face width", () => {
  const lane = LANES[0];
  const holes = classicHolesFor(lane);
  const fifty = holes.find((h) => h.value === 50);
  const hundreds = holes.filter((h) => h.value === 100);
  assert.ok(fifty);
  assert.equal(hundreds.length, 2);
  assert.ok(isReachableX(fifty.x, fifty.y, lane.lipY));
  for (const h of hundreds) {
    assert.ok(Math.abs(h.x) > 0.4, "100s sit in the corners");
    assert.ok(isReachableX(h.x, h.y, lane.lipY), `100 at x=${h.x} should be reachable`);
    assert.ok(Math.abs(h.x) < FACE_HALF);
  }
  for (const cup of SKEE_CUPS) {
    assert.ok(Math.abs(cup.lx) <= FACE_HALF - 0.02);
  }
});

test("render positions match simulation for the classic face", () => {
  const holes = classicHolesFor(LANES[0]);
  for (const h of holes) assert.ok(simMatchesFace(h), `${h.value} sim x ${h.x} != face ${h.faceX}`);
});

test("airborne overlap does not capture; contact does", () => {
  const lane = LANES[0];
  const fifty = classicHolesFor(lane).find((h) => h.value === 50);
  const air = makeTestBall(fifty.x, fifty.y, 0.2);
  air.vy = 0.4;
  assert.equal(canCapture(air, fifty), false);
  const on = makeTestBall(fifty.x, fifty.y, 0);
  on.vy = 0.4;
  assert.equal(canCapture(on, fifty), true);
});

test("overshooting the head does not score a cup", () => {
  const s = playClassic();
  const fifty = s.lane.holes.find((h) => h.value === 50);
  const b = s.balls[0];
  b.x = fifty.x;
  b.y = fifty.y;
  b.z = 0.18;
  b.vy = 3;
  b.alive = true;
  s.tryCapture(b);
  assert.equal(b.scored, false);
});

test("splitter waits until the ball is on the alley", () => {
  const s = playClassic();
  const split = s.hand.find((c) => c.effect === "split");
  assert.ok(split);
  s.toggleCard(split.uid);
  s.readyThrow();
  s.launch(0.7, 0);
  assert.equal(s.balls.length, 1, "one ball leaves the hand");
  const lead = s.balls[0];
  lead.y = 0.2;
  assert.equal(shouldSplitNow(lead, s.flags, s.splitSpawned), false);
  roll(s, 0.05);
  assert.equal(s.balls.length, 1);
  lead.y = SPLIT_Y + 0.02;
  s.stepRoll(1 / 60, { left: false, right: false, up: false });
  assert.ok(s.balls.length >= 2, "split happens during the roll");
});

test("tickets spend into selected and update labels and openings", () => {
  const s = playClassic();
  const wide = s.hand.find((c) => c.effect === "wide") ?? s.hand[0];
  const before = s.lane.holes.find((h) => h.value === 50)?.r ?? 0;
  s.toggleCard(wide.uid);
  assert.equal(s.selected.length, 1);
  s.readyThrow();
  if (wide.effect === "wide") {
    const fifty = s.lane.holes.find((h) => h.value === 50);
    assert.ok(fifty.r > before - 1e-9);
    assert.ok((fifty.faceR ?? 0) >= fifty.r * 0.5);
  }
  const holes = classicHolesFor(LANES[0]);
  applyWide(holes, 1.22);
  const h = holes.find((x) => x.value === 50);
  assert.ok(h.faceR > 0.05);
  for (const cup of holes) {
    cup.value = cup.value === 50 ? 80 : cup.value;
  }
  syncHoleLabels(holes);
  assert.equal(holes.find((x) => x.value === 80).label, "80");
});

test("wallet releases throw charge and ready returns to the lane", () => {
  const s = playClassic();
  s.charging = true;
  s.power = 0.8;
  s.toggleWallet();
  assert.equal(s.walletOpen, true);
  assert.equal(s.charging, false);
  assert.equal(s.power, 0);
  s.readyThrow();
  assert.equal(s.walletOpen, false);
  assert.ok(Math.abs(s.lookPitch - 0.08) < 1e-6);
  assert.equal(s.phase, "aim");
});

test("frame-rate: 30 Hz and 60 Hz keep the same capture decision on a parked ball", () => {
  const lane = LANES[0];
  const fifty = classicHolesFor(lane).find((h) => h.value === 50);
  const a = makeTestBall(fifty.x, fifty.y, 0);
  const b = makeTestBall(fifty.x, fifty.y, 0);
  assert.equal(canCapture(a, fifty), canCapture(b, fifty));
  const s60 = playClassic();
  const s30 = playClassic();
  s60.launch(0.55, 0);
  s30.launch(0.55, 0);
  roll(s60, 1.2, 1 / 60);
  roll(s30, 1.2, 1 / 30);
  assert.equal(s60.balls[0].alive, s30.balls[0].alive);
});

test("classic alley is narrower than the scoring face", () => {
  assert.ok(ALLEY_PLAY < FACE_HALF);
  const s = playClassic();
  assert.ok((s.world.alleyRail ?? 0) <= ALLEY_PLAY + 1e-9);
  assert.ok((s.world.faceRail ?? 0) >= FACE_HALF - 1e-9);
  const hundreds = s.lane.holes.filter((h) => h.value === 100);
  for (const h of hundreds) {
    assert.ok(Math.abs(h.x) > ALLEY_PLAY, "100s sit wider than the alley");
    assert.ok(Math.abs(h.x) < FACE_HALF);
  }
});
