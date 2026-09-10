import { makeBall, stepBall, railsFor, type HitEvent, type World } from "./physics";
import type { Ball, Bumper, Peg, Seg } from "./types";

export type BonusKind = "plinko" | "pinball";

export type BonusSlot = { x: number; w: number; label: string; chips: number; mult: number };

export type Flipper = {
  x: number;
  y: number;
  len: number;
  rest: number;
  active: number;
  side: 1 | -1;
  up: boolean;
};

export type BonusBoard = {
  kind: BonusKind;
  balls: Ball[];
  world: World;
  slots: BonusSlot[];
  flippers: Flipper[];
  time: number;
  maxTime: number;
  chips: number;
  mult: number;
  done: boolean;
  resultLabel: string;
  width: number;
  length: number;
};

function plinkoPegs(): Peg[] {
  const pegs: Peg[] = [];
  const rows = 8;
  for (let r = 0; r < rows; r++) {
    const n = 6 + (r % 2);
    const y = 0.55 + r * 0.28;
    for (let i = 0; i < n; i++) {
      const x = (i - (n - 1) / 2) * 0.14;
      pegs.push({ x, y, r: 0.028 });
    }
  }
  return pegs;
}

export function makePlinko(): BonusBoard {
  const width = 1;
  const length = 3.05;
  const rail = 0.46;
  const slots: BonusSlot[] = [
    { x: -0.375, w: 0.15, label: "40", chips: 40, mult: 0 },
    { x: -0.225, w: 0.15, label: "80", chips: 80, mult: 0 },
    { x: -0.075, w: 0.15, label: "+1", chips: 20, mult: 1 },
    { x: 0.075, w: 0.15, label: "120", chips: 120, mult: 0 },
    { x: 0.225, w: 0.15, label: "×2", chips: 10, mult: 0 },
    { x: 0.375, w: 0.15, label: "30", chips: 30, mult: 0 },
  ];
  slots[4]!.mult = 0;
  const world: World = {
    rail,
    length,
    lipY: length,
    segs: railsFor(rail, length),
    bumpers: [],
    pegs: plinkoPegs(),
    hills: [],
    spinners: [],
    crates: [],
  };
  const ball = makeBall((Math.random() - 0.5) * 0.12, 0.18);
  ball.vy = 0.35;
  return {
    kind: "plinko",
    balls: [ball],
    world,
    slots,
    flippers: [],
    time: 0,
    maxTime: 8,
    chips: 0,
    mult: 0,
    done: false,
    resultLabel: "",
    width,
    length,
  };
}

export function makePinball(): BonusBoard {
  const length = 2.4;
  const rail = 0.42;
  const bumpers: Bumper[] = [
    { x: -0.14, y: 1.45, r: 0.08, impulse: 1.7 },
    { x: 0.14, y: 1.45, r: 0.08, impulse: 1.7 },
    { x: 0, y: 1.72, r: 0.07, impulse: 1.85 },
  ];
  const pegs: Peg[] = [
    { x: -0.22, y: 1.1, r: 0.03 },
    { x: 0.22, y: 1.1, r: 0.03 },
    { x: 0, y: 1.2, r: 0.028 },
  ];
  const segs: Seg[] = [
    ...railsFor(rail, length),
    { ax: -0.42, ay: 0.22, bx: -0.16, by: 0.42 },
    { ax: 0.42, ay: 0.22, bx: 0.16, by: 0.42 },
  ];
  const world: World = {
    rail,
    length,
    lipY: length,
    segs,
    bumpers,
    pegs,
    hills: [],
    spinners: [],
    crates: [],
  };
  const ball = makeBall(0.08, 2.05);
  ball.vy = -1.1;
  ball.vx = -0.2;
  const flippers: Flipper[] = [
    { x: -0.18, y: 0.42, len: 0.16, rest: 0.45, active: -0.15, side: -1, up: false },
    { x: 0.18, y: 0.42, len: 0.16, rest: Math.PI - 0.45, active: Math.PI + 0.15, side: 1, up: false },
  ];
  return {
    kind: "pinball",
    balls: [ball],
    world,
    slots: [],
    flippers,
    time: 0,
    maxTime: 7,
    chips: 0,
    mult: 0,
    done: false,
    resultLabel: "",
    width: 1,
    length,
  };
}

function flipperGeometry(f: Flipper): Seg {
  const a = f.up ? f.active : f.rest;
  return { ax: f.x, ay: f.y, bx: f.x + Math.cos(a) * f.len, by: f.y + Math.sin(a) * f.len };
}

export function stepBonus(board: BonusBoard, dt: number, flip: boolean): HitEvent[] {
  if (board.done) return [];
  board.time += dt;
  const hits: HitEvent[] = [];

  if (board.kind === "pinball") {
    for (const f of board.flippers) f.up = flip;
    board.world.segs = board.world.segs.filter((s) => s.ay > 0.5 || s.ay === board.length);
    board.world.segs = [
      ...railsFor(board.world.rail, board.length),
      { ax: -0.42, ay: 0.22, bx: -0.16, by: 0.42 },
      { ax: 0.42, ay: 0.22, bx: 0.16, by: 0.42 },
      ...board.flippers.map(flipperGeometry),
    ];
  }

  for (const ball of board.balls) {
    if (!ball.alive) continue;
    if (board.kind === "plinko") ball.vy += 2.4 * dt;
    else ball.vy -= 2.8 * dt;
    const h = stepBall(ball, board.world, dt, 0.92, board.kind === "plinko" ? 0.12 : 0.18, {});
    hits.push(...h);
    for (const ev of h) {
      if (ev.kind === "bumper") board.chips += 12;
      if (ev.kind === "peg" && board.kind === "pinball") board.chips += 4;
    }

    if (board.kind === "plinko" && ball.y > board.length - 0.22) {
      const slot = board.slots.reduce((best, s) => {
        const d = Math.abs(ball.x - s.x);
        const bd = Math.abs(ball.x - best.x);
        return d < bd ? s : best;
      }, board.slots[0]!);
      board.chips += slot.chips;
      if (slot.label === "×2") board.mult += 0;
      if (slot.label === "+1") board.mult += 1;
      if (slot.label === "×2") {
        board.chips *= 2;
      }
      board.resultLabel = slot.label;
      ball.alive = false;
      board.done = true;
    }

    if (board.kind === "pinball" && (ball.y < 0.08 || board.time >= board.maxTime)) {
      ball.alive = false;
      board.done = true;
      board.resultLabel = `+${board.chips}`;
    }
  }

  if (board.time >= board.maxTime + 0.4 && !board.done) {
    board.done = true;
    board.resultLabel = board.chips ? `+${board.chips}` : "drain";
  }

  return hits;
}
