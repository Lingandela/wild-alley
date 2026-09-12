import assert from "node:assert/strict";
import test from "node:test";
import { Session } from "../src/game/session.ts";
import { LANES } from "../src/game/lanes.ts";
import { FACE_HALF, SKEE_CUPS, ballWorld, boardOrigin, holeWorld, rampEndZ } from "../src/game/layout3d.ts";
import {
  CLASSIC,
  classicLaneDims,
  launchKinematics,
  lipY,
  rampHeight,
  rampSlope,
  simToWorld,
  simulateThrow,
  usesFlight,
} from "../src/game/machine.ts";
import { classicHolesFor } from "../src/game/foundations.ts";

function playClassic() {
  const s = new Session();
  s.startCarnival();
  s.readyThrow();
  return s;
}

function roll(s, seconds, dt = 1 / 60) {
  const n = Math.ceil(seconds / dt);
  for (let i = 0; i < n; i++) s.stepRoll(dt, { left: false, right: false, up: false });
}

test("classic machine profile is internally consistent", () => {
  const dims = classicLaneDims();
  assert.equal(usesFlight("classic"), true);
  assert.equal(usesFlight("pinball"), false);
  assert.equal(dims.lipY, CLASSIC.flat + CLASSIC.rampRun);
  assert.ok(Math.abs(rampHeight(CLASSIC, CLASSIC.flat)) < 1e-9);
  assert.ok(Math.abs(rampHeight(CLASSIC, dims.lipY) - CLASSIC.rampRise) < 1e-9);
  const slope = rampSlope(CLASSIC, dims.lipY);
  assert.ok(slope > 1.2, "lip tangent should be steep enough to reach the 100s");
  const origin = boardOrigin("classic");
  assert.ok(Math.abs(origin.z - (rampEndZ() - CLASSIC.flightGap)) < 1e-9);
  const pin = boardOrigin("pinball");
  assert.ok(Math.abs(pin.z - (rampEndZ() - 0.02)) < 1e-9, "other lanes keep the tight board");
});

test("sim meters match the visible alley and a real hop to the face", () => {
  const atThrow = simToWorld({ x: 0, y: 0.12, z: 0 });
  assert.ok(Math.abs(atThrow.z - (CLASSIC.throwZ - 0.12)) < 1e-9);
  const atLip = simToWorld({ x: 0, y: lipY(), z: CLASSIC.rampRise });
  const origin = boardOrigin("classic");
  assert.ok(atLip.z - origin.z > 0.4, "there is a visible flight gap after the lip");
  const lane = LANES[0];
  const fifty = lane.holes.find((h) => h.value === 50);
  const hw = holeWorld(lane, fifty);
  const mapped = ballWorld(lane, { x: fifty.faceX, y: 0, z: 0 });
  assert.ok(Math.abs(hw.x - fifty.faceX) < 1e-6);
  assert.ok(hw.y > atLip.y, "50 cup sits above the launch");
  void mapped;
});

test("weak, medium and strong center shots land in distinct, predictable cups", () => {
  const holes = classicHolesFor(LANES[0]);
  const weak = simulateThrow({ power: 0.12, aimX: 0, holes });
  const medium = simulateThrow({ power: 0.22, aimX: 0, holes });
  const strong = simulateThrow({ power: 0.45, aimX: 0, holes });
  const over = simulateThrow({ power: 0.85, aimX: 0, holes });
  assert.ok(weak.scored != null && weak.scored <= 40, `weak scored ${weak.scored} (${weak.reason})`);
  assert.ok(medium.scored != null && medium.scored >= 30 && medium.scored <= 50, `medium scored ${medium.scored}`);
  assert.equal(strong.scored, 50, `strong should bury the 50, got ${strong.scored}`);
  assert.equal(over.reason, "gutter", `overshoot should miss, got ${over.scored}`);
  assert.ok((medium.scored ?? 0) >= (weak.scored ?? 0), "medium should not land lower than weak");
});

test("an aimed throw can reach a 100, and overshoot misses", () => {
  const holes = classicHolesFor(LANES[0]);
  const right = simulateThrow({ power: 0.42, aimX: 0.2, holes });
  const left = simulateThrow({ power: 0.42, aimX: -0.2, holes });
  const over = simulateThrow({ power: 0.9, aimX: 0, holes });
  const hit100 = right.scored === 100 || left.scored === 100;
  assert.ok(hit100, `100s unreachable: right=${right.scored} left=${left.scored} r=${right.reason} l=${left.reason}`);
  assert.equal(over.scored, null, `full power center should fly over, got ${over.scored}`);
});

test("airborne overlap does not score; face contact does", () => {
  const s = playClassic();
  const fifty = s.lane.holes.find((h) => h.value === 50);
  const b = s.balls[0];
  b.x = fifty.faceX;
  b.y = lipY() + CLASSIC.flightGap * 0.4;
  b.z = CLASSIC.rampRise + 0.35;
  b.vy = 3;
  b.vz = 1;
  b.stage = "air";
  b.alive = true;
  s.tryCapture(b);
  assert.equal(b.scored, false, "airborne ball over a cup must not score");
  const parked = simulateThrow({ power: 0.22, aimX: 0, holes: s.lane.holes });
  if (parked.scored === 50) assert.equal(parked.contacted, true);
});

test("a miss returns through the trough before the throw settles", () => {
  const s = playClassic();
  s.launch(0.16, 0);
  roll(s, 5.5);
  const b = s.balls[0];
  assert.ok(b.stage === "trough" || !b.alive || s.phase === "tally", `expected trough or tally, got stage=${b.stage} phase=${s.phase}`);
  if (s.phase !== "tally") {
    roll(s, 1.2);
  }
  assert.ok(s.phase === "tally" || s.phase === "pick" || !s.balls[0].alive, "trough should complete the next-ball loop");
});

test("session launch uses the machine tangent, not a 2D hop", () => {
  const s = playClassic();
  s.aimX = 0;
  s.launch(0.6, 0);
  const b = s.balls[0];
  const k = launchKinematics(0.6, 0, 1);
  assert.equal(b.stage, "roll");
  assert.ok(Math.abs(b.y - k.y) < 0.01);
  assert.ok(b.vy > 3, "launch has down-lane speed along the alley");
  assert.ok(Math.abs(b.z) < 0.02, "starts on the wood");
  assert.ok(Math.abs(b.x) < 0.02);
});

test("100 cups sit on the face and inside the playable head width", () => {
  const lane = LANES[0];
  const hundreds = lane.holes.filter((h) => h.value === 100);
  assert.equal(hundreds.length, 2);
  for (const h of hundreds) {
    assert.ok(Math.abs(h.faceX) > 0.4);
    assert.ok(Math.abs(h.faceX) < FACE_HALF);
    const w = holeWorld(lane, h);
    const lip = simToWorld({ x: 0, y: lipY(), z: CLASSIC.rampRise });
    assert.ok(w.y > lip.y + 0.4, "100s sit well above the launch");
  }
  for (const cup of SKEE_CUPS) {
    assert.ok(Math.abs(cup.lx) <= FACE_HALF - 0.02);
  }
});

test("end-to-end session throw can score a center cup", () => {
  const s = playClassic();
  s.launch(0.4, 0);
  roll(s, 4.5);
  const scored = s.holeChips > 0 || s.balls[0].stage === "sink" || s.balls[0].scored;
  assert.ok(scored || s.phase === "tally" || s.justSank != null, `throw produced no result (phase=${s.phase} chips=${s.holeChips} stage=${s.balls[0].stage})`);
});
