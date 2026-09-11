import {
  BALLS_CARNIVAL,
  BALLS_VERSUS,
  BALL_R,
  HAND_SIZE,
  LANES_CARNIVAL,
  MAX_PLAY,
  type Ball,
  type Hole,
  type LaneDef,
  type Mode,
  type Phase,
  type Snapshot,
  type TallyLine,
  type ThrowFlags,
  type UiCard,
} from "./types";
import { mint, prizePool, sabotageDeck, shuffle, starterDeck } from "./cards";
import { LANES, VERSUS_LANE_INDEX, cloneLane } from "./lanes";
import { makeBall, railsFor, stepBall, type HitEvent, type World } from "./physics";
import { makePinball, makePlinko, type BonusBoard } from "./bonus";
import { FACE_HALF, HALF_W, SEAT, SPAWN, usesBackboard } from "./layout3d";
import { applyWide, canCapture, shouldSplitNow, syncHoleLabels } from "./foundations";

/**
 * Session is the authority. snapshot() is the full public state a future
 * party room would send each tick. Scoring, balls, tickets, and seats live
 * here — meshes only present that state. Do not hide game rules in the 3D tree.
 */

function rngMulberry(seed: number) {
  let s = seed >>> 0;
  return () => {
    s += 0x6d2b79f5;
    let t = s;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function defaultFlags(): ThrowFlags {
  return {
    magnet: false,
    heavy: false,
    superball: false,
    split: false,
    grease: false,
    anchor: false,
    tailwind: false,
    lucky: false,
    nest: false,
    streak: false,
    tax: false,
    crossbreeze: false,
    gravityWell: false,
    restitution: 0.16,
    friction: 0.2,
    launchScale: 1,
    holeScale: 1,
    chipsAdd: 0,
    multAdd: 0,
    multMul: 1,
  };
}

export class Session {
  mode: Mode = "demo";
  phase: Phase = "demo";
  paused = false;
  screen: Snapshot["screen"] = "menu";
  laneIndex = 0;
  lane!: LaneDef;
  world!: World;
  balls: Ball[] = [];
  flags = defaultFlags();
  deck: UiCard[] = [];
  discard: UiCard[] = [];
  hand: UiCard[] = [];
  selected: string[] = [];
  owned = new Set<string>();
  sabotageBags: [UiCard[], UiCard[]] = [[], []];
  sabotageHands: [UiCard[], UiCard[]] = [[], []];
  sabotageUsed = false;
  prizes: UiCard[] = [];
  scores: [number, number] = [0, 0];
  player = 0;
  names: [string, string] = ["Ace", "Deuce"];
  ballsLeft = BALLS_CARNIVAL;
  ballsEach = BALLS_CARNIVAL;
  ballsLeftBy: [number, number] = [BALLS_CARNIVAL, BALLS_CARNIVAL];
  chips = 0;
  mult = 1;
  bumperChips = 0;
  holeChips = 0;
  tally: TallyLine[] = [];
  tallyTotal = 0;
  lastThrowScore = 0;
  lastHole = "";
  message = "";
  flash = "";
  flashT = 0;
  introT = 0;
  phaseT = 0;
  power = 0;
  charging = false;
  aimX = 0;
  lookYaw = 0;
  lookPitch = -0.22;
  time = 0;
  bonus: BonusBoard | null = null;
  pendingSpecial: "plinko" | "pinball" | null = null;
  highScore = 0;
  muted = false;
  rng = rngMulberry(Date.now() & 0xffff);
  houseCheat = false;
  hitQueue: HitEvent[] = [];
  laneEpoch = 0;
  walletOpen = false;
  /** E / HUD pinned the wallet open so looking up does not auto-close it. */
  walletPinned = false;
  justSank: number | "gutter" | null = null;
  playerX = SPAWN.x;
  playerZ = SPAWN.z;
  playerSpeed = 0;
  moveHeading = 0.42;
  pointerLocked = false;
  seated = false;
  seatLatch = false;
  fxName = "";
  fxT = 0;
  fxX = 0;
  fxY = 0.12;
  splitSpawned = false;

  constructor() {
    this.bootDemo();
  }

  bootDemo() {
    this.mode = "demo";
    this.screen = "menu";
    this.phase = "demo";
    this.paused = false;
    this.loadLane(0);
    this.balls = [];
    this.spawnIdleBall();
    this.message = "";
    this.walletOpen = false;
    this.walletPinned = false;
    this.playerX = SPAWN.x;
    this.playerZ = SPAWN.z;
    this.lookYaw = 0;
    this.moveHeading = 0;
    this.lookPitch = -0.08;
    this.seated = false;
    this.seatLatch = false;
  }

  private spawnIdleBall() {
    const b = makeBall((this.rng() - 0.5) * 0.1, 0.12, BALL_R);
    b.vy = 1.85 + this.rng() * 1.15;
    b.vx = (this.rng() - 0.5) * 0.28;
    this.balls = [b];
    this.phase = this.mode === "demo" ? "demo" : this.phase;
  }

  loadLane(index: number) {
    const src = LANES[index] ?? LANES[0]!;
    this.laneIndex = index;
    this.lane = cloneLane(src);
    this.rebuildWorld();
  }

  rebuildWorld() {
    const back = usesBackboard(this.lane.theme);
    this.world = {
      rail: this.lane.rail,
      alleyRail: back ? HALF_W : this.lane.rail,
      faceRail: back ? FACE_HALF : this.lane.rail,
      length: this.lane.length,
      lipY: this.lane.lipY,
      segs: railsFor(back ? HALF_W : this.lane.rail, back ? this.lane.lipY : this.lane.length, { cap: !back }),
      bumpers: this.lane.bumpers,
      pegs: this.lane.pegs,
      hills: this.lane.hills,
      spinners: this.lane.spinners,
      crates: this.lane.crates,
      oil: this.lane.oil,
    };
    this.laneEpoch += 1;
  }

  startCarnival() {
    this.mode = "carnival";
    this.screen = "play";
    this.player = 0;
    this.scores = [0, 0];
    this.ballsEach = BALLS_CARNIVAL;
    this.ballsLeft = BALLS_CARNIVAL;
    this.ballsLeftBy = [BALLS_CARNIVAL, 0];
    this.owned = new Set(starterDeck().map((c) => c.id));
    this.deck = shuffle(starterDeck().map(mint), this.rng);
    this.discard = [];
    this.hand = [];
    this.drawHand();
    if (!this.hand.some((c) => c.effect === "split")) {
      const i = this.deck.findIndex((c) => c.effect === "split");
      if (i >= 0) {
        const take = this.deck.splice(i, 1)[0]!;
        const drop = this.hand.pop();
        this.hand.unshift(take);
        if (drop) this.deck.push(drop);
      }
    }
    this.lastThrowScore = 0;
    this.seatAtTable();
    this.beginLane(0);
  }

  startVersus() {
    this.mode = "versus";
    this.screen = "play";
    this.player = 0;
    this.scores = [0, 0];
    this.ballsEach = BALLS_VERSUS;
    this.ballsLeft = BALLS_VERSUS;
    this.ballsLeftBy = [BALLS_VERSUS, BALLS_VERSUS];
    this.owned = new Set(starterDeck().map((c) => c.id));
    this.deck = shuffle(starterDeck().map(mint), this.rng);
    this.discard = [];
    this.hand = [];
    this.drawHand();
    const bag = shuffle(sabotageDeck().map(mint), this.rng);
    this.sabotageBags = [bag.slice(0, 3), bag.slice(3)];
    this.sabotageHands = [this.sabotageBags[0]!.slice(0, 2), this.sabotageBags[1]!.slice(0, 2)];
    this.lastThrowScore = 0;
    this.seatAtTable();
    this.beginLane(VERSUS_LANE_INDEX[0]!);
  }

  beginLane(index: number) {
    this.loadLane(index);
    this.balls = [makeBall(0, 0.12, BALL_R)];
    this.selected = [];
    this.flags = defaultFlags();
    this.bonus = null;
    this.pendingSpecial = null;
    this.sabotageUsed = false;
    this.houseCheat = false;
    this.phase = "intro";
    this.introT = 1.8;
    this.phaseT = 0;
    this.power = 0;
    this.walletOpen = false;
    this.walletPinned = false;
    this.message = "Balls on the rail. E for the wallet. Look down at your lap.";
    this.kickFx("lane", 0, this.lane.lipY);
  }

  seatAtTable() {
    this.seated = true;
    this.seatLatch = true;
    this.playerX = SEAT.x;
    this.playerZ = SEAT.z;
    this.lookYaw = 0;
    this.moveHeading = 0;
    this.lookPitch = 0.08;
  }

  drawHand() {
    while (this.hand.length < HAND_SIZE) {
      if (this.deck.length === 0) {
        if (this.discard.length === 0) break;
        this.deck = shuffle(this.discard, this.rng);
        this.discard = [];
      }
      const c = this.deck.pop();
      if (c) this.hand.push(c);
    }
  }

  toggleCard(uid: string) {
    if (this.paused) return;
    if (this.phase !== "pick" && this.phase !== "intro" && this.phase !== "aim") return;
    const i = this.selected.indexOf(uid);
    if (i >= 0) {
      this.selected.splice(i, 1);
      if (this.phase === "aim") this.applySelectedCards();
      return;
    }
    if (this.selected.length >= MAX_PLAY) return;
    if (!this.hand.some((c) => c.uid === uid)) return;
    this.selected.push(uid);
    this.kickFx(this.hand.find((c) => c.uid === uid)?.effect ?? "card");
    if (this.phase === "aim") this.applySelectedCards();
  }

  standUp() {
    this.seated = false;
    this.seatLatch = false;
    this.walletOpen = false;
    this.walletPinned = false;
    this.charging = false;
  }

  readyThrow() {
    if (this.phase !== "pick" && this.phase !== "intro" && this.phase !== "aim") {
      if (this.phase !== "handoff") return;
    }
    if (this.phase === "pick" || this.phase === "intro" || this.phase === "handoff") {
      this.applySelectedCards();
    }
    this.phase = "aim";
    this.phaseT = 0;
    this.power = 0;
    this.charging = false;
    this.aimX = 0;
    if (this.balls.length === 0) this.balls = [makeBall(0, 0.12, BALL_R)];
    this.walletOpen = false;
    this.walletPinned = false;
    this.lookPitch = 0.08;
    this.lookYaw = 0;
    this.message = "Pull back. W / Space or drag. Let go.";
  }

  applySelectedCards() {
    this.flags = defaultFlags();
    this.lane = cloneLane(LANES[this.laneIndex] ?? LANES[0]!);
    for (const uid of this.selected) {
      const card = this.hand.find((c) => c.uid === uid);
      if (card) this.applyEffect(card.effect, false);
    }
    this.rebuildWorld();
    const lead = this.selected
      .map((uid) => this.hand.find((c) => c.uid === uid))
      .find(Boolean);
    if (lead) this.kickFx(lead.effect);
  }

  applyEffect(effect: string, sabotage: boolean) {
    const f = this.flags;
    switch (effect) {
      case "heavy":
        f.heavy = true;
        f.restitution = 0.1;
        f.friction += 0.18;
        f.launchScale = 0.88;
        f.chipsAdd += 18;
        break;
      case "superball":
        f.superball = true;
        f.restitution = 0.72;
        break;
      case "magnet":
        f.magnet = true;
        break;
      case "grease":
        f.grease = true;
        f.friction *= 0.28;
        break;
      case "split":
        f.split = true;
        break;
      case "anchor":
        f.anchor = true;
        f.friction += 0.1;
        break;
      case "lucky":
        f.lucky = true;
        f.chipsAdd += 40;
        break;
      case "wide":
        this.flags.holeScale = 1.22;
        applyWide(this.lane.holes, 1.22);
        break;
      case "bumpers":
        this.lane.bumpers.push(
          { x: -0.14, y: this.lane.lipY * 0.55, r: 0.065, impulse: 1.5 },
          { x: 0.14, y: this.lane.lipY * 0.55, r: 0.065, impulse: 1.5 },
          { x: 0, y: this.lane.lipY * 0.72, r: 0.06, impulse: 1.6 },
        );
        break;
      case "raise50":
        for (const h of this.lane.holes) if (h.value === 50) h.value = 80;
        break;
      case "tailwind":
        f.tailwind = true;
        break;
      case "swap":
        for (const h of this.lane.holes) {
          if (h.value === 10) h.value = 100;
          else if (h.value === 100) h.value = 10;
        }
        break;
      case "rails":
        this.lane.rail = Math.max(0.3, this.lane.rail - 0.07);
        break;
      case "tip":
        f.multAdd += 1;
        break;
      case "double":
        f.multMul *= 2;
        break;
      case "nest":
        f.nest = true;
        break;
      case "streak":
        f.streak = true;
        break;
      case "tax":
        f.tax = true;
        break;
      case "trap":
        for (const h of this.lane.holes)
          if (h.value === 100) {
            h.value = 0;
            h.label = "OUT";
            h.special = undefined;
          }
        break;
      case "crossbreeze":
        f.crossbreeze = true;
        break;
      case "crate":
        this.lane.crates.push({ x: 0, y: this.lane.length - 0.5, w: 0.22, h: 0.1 });
        break;
      case "flip":
        for (const h of this.lane.holes) {
          if (h.value >= 50) h.value = 10;
          else if (h.value <= 20) h.value = 80;
        }
        break;
      case "gravityWell":
        f.gravityWell = true;
        break;
      case "shrink":
        for (const h of this.lane.holes) if (h.value === 100) h.r *= 0.55;
        break;
      default:
        break;
    }
    if (sabotage) {
      this.rebuildWorld();
      this.kickFx(effect);
    }
    syncHoleLabels(this.lane.holes);
  }

  kickFx(name: string, x?: number, y?: number) {
    this.fxName = name;
    this.fxT = 1;
    this.fxX = x ?? this.aimX;
    this.fxY = y ?? 0.12;
  }

  wants(effect: string): boolean {
    const f = this.flags;
    const flagged: Record<string, boolean> = {
      magnet: f.magnet,
      heavy: f.heavy,
      superball: f.superball,
      split: f.split,
      grease: f.grease,
      anchor: f.anchor,
      tailwind: f.tailwind,
      lucky: f.lucky,
      nest: f.nest,
      streak: f.streak,
      tax: f.tax,
      crossbreeze: f.crossbreeze,
      gravityWell: f.gravityWell,
    };
    if (flagged[effect]) return true;
    return this.selected.some((uid) => this.hand.find((c) => c.uid === uid)?.effect === effect);
  }

  playSabotage(uid: string) {
    if (!this.canSabotage() || this.sabotageUsed) return;
    const hand = this.sabotageHands[1 - this.player]!;
    const card = hand.find((c) => c.uid === uid);
    if (!card) return;
    this.applyEffect(card.effect, true);
    this.sabotageHands[1 - this.player] = hand.filter((c) => c.uid !== uid);
    this.sabotageUsed = true;
    this.flashMsg(`${card.name}!`);
    this.kickFx(card.effect);
  }

  canSabotage() {
    return this.mode === "versus" && this.phase === "roll" && !this.sabotageUsed;
  }

  launch(power: number, vx: number) {
    const p = Math.max(0.12, Math.min(1, power));
    const ball = this.balls[0] ?? makeBall(this.aimX, 0.12, BALL_R);
    ball.x = this.aimX;
    ball.y = 0.12;
    ball.z = 0;
    ball.vx = vx;
    ball.vy = (1.55 + p * 3.05) * this.flags.launchScale;
    ball.alive = true;
    ball.scored = false;
    ball.rest = 0;
    ball.superSkip = this.flags.superball;
    this.balls = [ball];
    this.splitSpawned = false;
    if (this.flags.split) {
      this.kickFx("throw", this.aimX, 0.12);
    } else {
      this.kickFx(this.flags.heavy ? "heavy" : this.flags.magnet ? "magnet" : "throw", this.aimX, 0.12);
    }
    this.phase = "roll";
    this.phaseT = 0;
    this.charging = false;
    this.walletOpen = false;
    this.walletPinned = false;
    this.power = p;
    this.chips = 0;
    this.bumperChips = 0;
    this.holeChips = 0;
    this.pendingSpecial = null;
    this.sabotageUsed = false;
    this.message = "";
    if (this.mode === "carnival" && this.lane.theme === "chaos" && this.rng() < 0.42) {
      this.houseCheat = true;
      const cheats = ["crossbreeze", "crate", "shrink"];
      const pick = cheats[Math.floor(this.rng() * cheats.length)]!;
      this.applyEffect(pick, true);
      this.flashMsg("The house meddles");
    }
  }

  flashMsg(s: string) {
    this.flash = s;
    this.flashT = 1.4;
  }

  nearestHole(x: number, y: number): Hole | null {
    let best: Hole | null = null;
    let bd = 9;
    for (const h of this.lane.holes) {
      const d = Math.hypot(h.x - x, h.y - y);
      if (d < bd) {
        bd = d;
        best = h;
      }
    }
    return best;
  }

  tryCapture(b: Ball): boolean {
    if (b.scored || !b.alive) return false;
    for (const h of this.lane.holes) {
      if (!canCapture(b, h)) continue;
      if (b.superSkip) {
        b.superSkip = false;
        const d = Math.hypot(b.x - h.x, b.y - h.y) || 1;
        const nx = (b.x - h.x) / d;
        const ny = (b.y - h.y) / d;
        b.vx = nx * 1.4 + b.vx * 0.3;
        b.vy = ny * 1.4 + b.vy * 0.3;
        this.holeChips += Math.max(10, Math.floor(h.value * 0.5));
        this.flashMsg(`KISS +${Math.floor(h.value * 0.5)}`);
        return false;
      }
      b.scored = true;
      b.alive = false;
      b.vx = 0;
      b.vy = 0;
      b.x = h.x;
      b.y = h.y;
      this.sinkHole(h, b);
      return true;
    }
    return false;
  }

  sinkHole(h: Hole, b?: Ball) {
    const v = h.value;
    this.holeChips += v;
    this.lastHole = h.label ?? String(v);
    this.justSank = v;
    if (h.special === "mult") {
      this.flags.multAdd += 1;
      this.flashMsg("+1 MULT");
    }
    if (h.special === "plinko" || h.special === "pinball") {
      this.pendingSpecial = h.special;
    }
    if (b) {
      b.scored = true;
      b.alive = false;
    } else if (this.balls[0]) {
      this.balls[0].scored = true;
      this.balls[0].alive = false;
    }
  }

  ballsSettled() {
    if (this.balls.length === 0) return true;
    return this.balls.every((b) => !b.alive || b.scored || (Math.hypot(b.vx, b.vy) < 0.08 && b.y < 0.2) || b.rest > 0.55);
  }

  stepRolling(dt: number, extra: { left: boolean; right: boolean; up: boolean; wind: number }) {
    const extrasBase = {
      magnetX: undefined as number | undefined,
      magnetY: undefined as number | undefined,
      windX: (this.flags.crossbreeze ? Math.sin(this.time * 7.5) * 1.35 : 0) + extra.wind * 0.85,
      windY: this.flags.tailwind ? 0.42 : 0,
      wellX: undefined as number | undefined,
      wellY: undefined as number | undefined,
    };
    for (const b of this.balls) {
      if (!b.alive || b.scored) continue;
      if (this.flags.magnet) {
        const h = this.nearestHole(b.x, b.y);
        if (h) {
          extrasBase.magnetX = h.x;
          extrasBase.magnetY = h.y;
        }
      }
      if (this.flags.gravityWell) {
        extrasBase.wellX = b.x > 0 ? this.lane.rail : -this.lane.rail;
        extrasBase.wellY = b.y;
      }
      if (!this.flags.anchor && b.y > this.lane.lipY && b.vy > 1.55 && b.z <= 0) {
        b.z = 0.02;
        b.vz = (b.vy - 1.4) * 0.28;
      }
      const hits = stepBall(b, this.world, dt, this.flags.restitution, this.flags.friction, extrasBase);
      this.hitQueue.push(...hits);
      for (const h of hits) {
        if (h.kind === "bumper") this.bumperChips += 8;
      }
      this.tryCapture(b);
    }
    const lead = this.balls.find((b) => b.alive && !b.scored);
    if (lead && shouldSplitNow(lead, this.flags, this.splitSpawned)) {
      const twin = makeBall(lead.x, lead.y, BALL_R);
      twin.vx = -lead.vx * 0.55 - 0.12;
      twin.vy = lead.vy * 0.94;
      twin.z = lead.z;
      twin.vz = lead.vz;
      twin.superSkip = this.flags.superball;
      this.balls.push(twin);
      this.splitSpawned = true;
      this.kickFx("split", lead.x, lead.y);
      this.flashMsg("SPLITTER");
    }
  }

  enterBonus(kind: "plinko" | "pinball") {
    this.pendingSpecial = null;
    this.bonus = kind === "plinko" ? makePlinko() : makePinball();
    this.phase = "bonus";
    this.phaseT = 0;
    this.flashMsg(kind === "plinko" ? "PLINKO" : "PINBALL");
    this.message = kind === "pinball" ? "Tap or Space to flip" : "Watch it drop";
  }

  completeBonus(chips: number, multAdd: number) {
    if (this.phase !== "bonus") return;
    this.holeChips += chips;
    this.flags.multAdd += multAdd;
    this.bonus = null;
    this.beginTally();
  }

  tickDemo(dt: number) {
    this.stepRolling(dt, { left: false, right: false, up: false, wind: 0 });
    if (this.ballsSettled() || this.phaseT > 5.5) {
      this.spawnIdleBall();
      this.phase = "demo";
      this.phaseT = 0;
    }
  }

  stepRoll(dt: number, input: { left: boolean; right: boolean; up: boolean }) {
    const steer = ((input.left ? -1 : 0) + (input.right ? 1 : 0)) * this.lane.steer;
    if (input.up) {
      for (const b of this.balls) if (b.alive && !b.scored) b.vy += 1.55 * dt;
    }
    this.stepRolling(dt, { left: input.left, right: input.right, up: input.up, wind: steer });
    if (this.pendingSpecial && this.balls.every((b) => b.scored || !b.alive)) {
      this.enterBonus(this.pendingSpecial);
      return;
    }
    const live = this.balls.filter((b) => b.alive && !b.scored);
    if (live.length === 0) {
      this.beginTally();
      return;
    }
    let moving = false;
    for (const b of live) {
      const spd = Math.hypot(b.vx, b.vy);
      if (spd < 0.09) b.rest += dt;
      else b.rest = 0;
      if (b.y < -0.05 || (b.y < 0.18 && spd < 0.12 && b.rest > 0.4)) {
        b.alive = false;
        this.justSank = "gutter";
      }
      if (spd > 0.1) moving = true;
    }
    if (!moving && this.phaseT > 0.8 && live.every((b) => b.rest > 0.5)) this.beginTally();
    if (this.phaseT > 14) this.beginTally();
  }

  stepMeta(dt: number) {
    this.time += dt;
    this.phaseT += dt;
    if (this.flashT > 0) this.flashT -= dt;
    if (this.flashT <= 0) this.flash = "";
    if (this.fxT > 0) this.fxT = Math.max(0, this.fxT - dt * 0.9);
    for (const sp of this.lane.spinners) sp.angle += sp.omega * dt;
    if (this.paused) return;
    if (this.phase === "intro") {
      this.introT -= dt;
      if (this.introT <= 0) {
        this.phase = "pick";
        this.phaseT = 0;
        this.message = "E for the wallet · then roll.";
      }
    }
    if (this.phase === "tally" && this.phaseT > 2.6) this.afterTally();
  }

  beginTally() {
    if (this.phase === "tally") return;
    this.phase = "tally";
    this.phaseT = 0;
    const base = this.holeChips + this.bumperChips;
    let chips = base + this.flags.chipsAdd;
    if (this.flags.nest) chips += Math.floor(this.scores[this.player]! * 0.15);
    let mult = 1 + this.flags.multAdd;
    if (this.flags.streak && this.lastThrowScore >= 50) mult += 2;
    if (this.flags.tax && this.lastHole === "10") mult += 3;
    mult *= this.flags.multMul;
    if (mult < 1) mult = 1;
    const total = Math.floor(chips * mult);
    this.chips = chips;
    this.mult = mult;
    this.tallyTotal = total;
    this.tally = [
      { label: "Cups", value: String(this.holeChips), kind: "chips" },
      { label: "Bumpers", value: String(this.bumperChips), kind: "chips" },
      { label: "Tickets", value: String(this.flags.chipsAdd + (this.flags.nest ? Math.floor(this.scores[this.player]! * 0.15) : 0)), kind: "chips" },
      { label: "Chips", value: String(chips), kind: "chips" },
      { label: "Mult", value: `×${mult}`, kind: "mult" },
      { label: "Score", value: String(total), kind: "total" },
    ];
    this.scores[this.player] += total;
    this.lastThrowScore = this.holeChips;
    if (this.mode === "versus") {
      this.ballsLeftBy[this.player] -= 1;
      this.ballsLeft = this.ballsLeftBy[this.player]!;
    } else {
      this.ballsLeft -= 1;
    }
    this.message = total === 0 ? "Gutter ball" : "";
    for (const uid of this.selected) {
      const card = this.hand.find((c) => c.uid === uid);
      if (card) this.discard.push(card);
    }
    this.hand = this.hand.filter((c) => !this.selected.includes(c.uid));
    this.selected = [];
    this.drawHand();
  }

  skipTally() {
    if (this.phase === "tally") this.afterTally();
  }

  afterTally() {
    this.flags = defaultFlags();
    this.lane = cloneLane(LANES[this.laneIndex] ?? LANES[0]!);
    this.rebuildWorld();
    if (this.mode === "versus") {
      const other = 1 - this.player;
      const selfLeft = this.ballsLeftBy[this.player]!;
      const otherLeft = this.ballsLeftBy[other]!;
      if (selfLeft <= 0 && otherLeft <= 0) {
        this.nextLaneOrEnd();
        return;
      }
      if (otherLeft > 0) {
        this.player = other;
        this.ballsLeft = otherLeft;
        this.handOffOrContinue();
        return;
      }
      this.phase = "pick";
      this.phaseT = 0;
      this.walletOpen = false;
      this.walletPinned = false;
      this.balls = [makeBall(0, 0.12, BALL_R)];
      this.message = `${this.names[this.player]} to throw`;
      return;
    }
    if (this.ballsLeft <= 0) {
      this.nextLaneOrEnd();
      return;
    }
    this.phase = "pick";
    this.phaseT = 0;
    this.walletOpen = false;
    this.walletPinned = false;
    this.balls = [makeBall(0, 0.12, BALL_R)];
    this.message = `${this.ballsLeft} ball${this.ballsLeft === 1 ? "" : "s"} left`;
  }

  handOffOrContinue() {
    this.phase = "handoff";
    this.phaseT = 0;
    this.message = `Pass to ${this.names[this.player]}`;
  }

  finishHandoff() {
    this.phase = "pick";
    this.phaseT = 0;
    this.walletOpen = false;
    this.walletPinned = false;
    this.balls = [makeBall(0, 0.12, BALL_R)];
  }

  nextLaneOrEnd() {
    if (this.mode === "carnival") {
      if (this.laneIndex >= LANES_CARNIVAL - 1) {
        this.endRun();
        return;
      }
      const pool = prizePool(this.owned);
      if (pool.length === 0) {
        this.beginLane(this.laneIndex + 1);
        this.ballsLeft = this.ballsEach;
        this.ballsLeftBy = [this.ballsEach, 0];
        return;
      }
      const shuffled = shuffle(pool, this.rng).slice(0, 3);
      this.prizes = shuffled.map(mint);
      this.phase = "prize";
      this.phaseT = 0;
      this.message = "Pick a prize for the next alley";
      return;
    }
    const idx = VERSUS_LANE_INDEX.indexOf(this.laneIndex);
    if (idx < 0 || idx >= VERSUS_LANE_INDEX.length - 1) {
      this.endRun();
      return;
    }
    this.ballsLeft = this.ballsEach;
    this.ballsLeftBy = [this.ballsEach, this.ballsEach];
    this.beginLane(VERSUS_LANE_INDEX[idx + 1]!);
  }

  pickPrize(uid: string) {
    if (this.phase !== "prize") return;
    const card = this.prizes.find((c) => c.uid === uid);
    if (card) {
      this.owned.add(card.id);
      this.discard.push(card);
    }
    this.prizes = [];
    this.ballsLeft = this.ballsEach;
    this.ballsLeftBy = [this.ballsEach, 0];
    this.beginLane(this.laneIndex + 1);
  }

  endRun() {
    this.phase = "results";
    this.screen = "results";
    this.phaseT = 0;
    this.walletOpen = false;
    this.walletPinned = false;
    if (this.mode === "carnival" && this.scores[0]! > this.highScore) {
      this.highScore = this.scores[0]!;
    }
  }

  toMenu() {
    this.bootDemo();
  }

  consumeHits(): HitEvent[] {
    const h = this.hitQueue;
    this.hitQueue = [];
    return h;
  }

  snapshot(): Snapshot {
    const laneCount = this.mode === "versus" ? 3 : 5;
    const versusLane = VERSUS_LANE_INDEX.indexOf(this.laneIndex);
    return {
      screen: this.screen,
      mode: this.mode,
      phase: this.phase,
      paused: this.paused,
      laneName: this.lane.name,
      laneBlurb: this.lane.blurb,
      laneIndex: this.mode === "versus" ? Math.max(0, versusLane) : this.laneIndex,
      laneCount,
      theme: this.lane.theme,
      player: this.player,
      names: this.names,
      scores: [...this.scores] as [number, number],
      ballsLeft: this.ballsLeft,
      ballsEach: this.ballsEach,
      chips: this.chips,
      mult: this.mult,
      tally: this.tally,
      tallyTotal: this.tallyTotal,
      hand: this.hand,
      selected: [...this.selected],
      sabotageHand: this.mode === "versus" ? this.sabotageHands[1 - this.player]! : [],
      canSabotage: this.canSabotage(),
      sabotageUsed: this.sabotageUsed,
      prizes: this.prizes,
      power: this.power,
      message: this.message,
      flash: this.flash,
      highScore: this.highScore,
      muted: this.muted,
      lastHole: this.lastHole,
      introName: this.lane.name,
      canReady: this.phase === "pick",
      walletOpen: this.walletOpen,
      isVersus: this.mode === "versus",
      winner: this.scores[0]! === this.scores[1]! ? -1 : this.scores[0]! > this.scores[1]! ? 0 : 1,
      pointerLocked: this.pointerLocked,
      seated: this.seated,
    };
  }

  speed() {
    if (this.playerSpeed > 0.02) return this.playerSpeed;
    const b = this.balls.find((x) => x.alive) ?? this.balls[0];
    return b ? Math.hypot(b.vx, b.vy) : 0;
  }

  toggleWallet() {
    if (this.paused) return;
    if (this.screen === "results" || this.screen === "how") return;
    this.walletOpen = !this.walletOpen;
    this.walletPinned = this.walletOpen;
    if (this.walletOpen) {
      this.charging = false;
      this.power = 0;
    }
  }

  /** Look-down opens an unpinned wallet. Looking up closes it unless E-pinned. */
  setLookWallet(open: boolean) {
    if (this.paused) return;
    if (this.screen === "results" || this.screen === "how") return;
    if (open) {
      if (!this.walletOpen) {
        this.walletOpen = true;
        this.walletPinned = false;
        this.charging = false;
        this.power = 0;
      }
      return;
    }
    if (this.walletOpen && !this.walletPinned) this.walletOpen = false;
  }

  yaw() {
    return this.moveHeading;
  }

  nudgeHeading(delta: number) {
    this.moveHeading += delta;
    if (!this.seated) this.lookYaw += delta;
  }

  forceForward(v: number) {
    this.playerSpeed = Math.max(this.playerSpeed, 3.2);
    if (this.phase === "pick" || this.phase === "intro" || this.phase === "handoff") this.readyThrow();
    if (this.phase === "aim" || this.phase === "tally" || this.phase === "prize") {
      this.launch(Math.max(0.45, this.power || 0.55), this.aimX * 0.08);
    }
    if (this.balls.length === 0) this.balls = [makeBall(this.aimX, 0.12, BALL_R)];
    for (const b of this.balls) {
      b.alive = true;
      b.scored = false;
      b.vy += v;
    }
    if (this.phase !== "bonus" && this.phase !== "results") this.phase = "roll";
  }
}
