import { MAX_SPEED, type Ball, type Hole, type LaneTheme, type ThrowFlags } from "./types";
import type { HitEvent } from "./physics";

/**
 * One source of meters for the classic skee-ball cabinet.
 * Simulation, capture, cup layout and meshes all read from here.
 *
 * Sim: x = world X, y = down-lane meters from the thrower, z = height
 * of the ball center above the flat wood, minus visR (0 = sitting on the alley).
 */
export const CLASSIC = {
  playY: 0.86,
  throwZ: 1.18,
  visR: 0.048,
  alleyHalf: 0.34,
  faceHalf: 0.52,
  flat: 2.05,
  rampRun: 0.68,
  rampRise: 0.46,
  flightGap: 0.72,
  boardLean: 0.2,
  boardLift: 0.02,
  faceR: 0.56,
  faceCy: 0.54,
  headW: 1.22,
  headH: 1.36,
  g: 7.6,
  launchMin: 2.55,
  launchGain: 5.05,
  englishScale: 0.95,
  airEnglish: 1.65,
  woodRest: 0.1,
  rimRest: 0.42,
  faceFriction: 1.05,
  sinkTime: 0.38,
  troughTime: 0.9,
  rimWidth: 0.024,
  captureScale: 1.02,
} as const;

export type Machine = typeof CLASSIC;

export function usesFlight(theme: LaneTheme) {
  return theme === "classic";
}

export function lipY(m: Machine = CLASSIC) {
  return m.flat + m.rampRun;
}

export function classicLaneDims() {
  const lip = lipY();
  return { length: lip + 1.05, lipY: lip, rail: CLASSIC.faceHalf };
}

export function rampU(m: Machine, y: number) {
  if (y <= m.flat) return 0;
  if (y >= m.flat + m.rampRun) return 1;
  return (y - m.flat) / m.rampRun;
}

/** Quadratic ramp so the lip has a real launch tangent (smoothstep ends flat). */
export function rampHeight(m: Machine, y: number) {
  const u = rampU(m, y);
  return m.rampRise * u * u;
}

/** dh/dy at sim y. At the lip this is 2 * rise / run. */
export function rampSlope(m: Machine, y: number) {
  if (y <= m.flat) return 0;
  const u = y >= m.flat + m.rampRun ? 1 : rampU(m, y);
  return (2 * m.rampRise * u) / m.rampRun;
}

export function boardOrigin(theme: LaneTheme = "classic") {
  const m = CLASSIC;
  const gap = usesFlight(theme) ? m.flightGap : 0.02;
  return {
    x: 0,
    y: m.playY + m.rampRise + m.boardLift,
    z: m.throwZ - m.flat - m.rampRun - gap,
  };
}

export function boardLocalToWorld(lx: number, ly: number, lz: number, theme: LaneTheme = "classic") {
  const o = boardOrigin(theme);
  const th = -CLASSIC.boardLean;
  const c = Math.cos(th);
  const s = Math.sin(th);
  return {
    x: o.x + lx,
    y: o.y + ly * c - lz * s,
    z: o.z + ly * s + lz * c,
  };
}

export function worldToBoard(x: number, y: number, z: number, theme: LaneTheme = "classic") {
  const o = boardOrigin(theme);
  const th = -CLASSIC.boardLean;
  const c = Math.cos(th);
  const s = Math.sin(th);
  const py = y - o.y;
  const pz = z - o.z;
  return {
    lx: x - o.x,
    ly: py * c + pz * s,
    lz: -py * s + pz * c,
  };
}

export function simToWorld(b: { x: number; y: number; z: number }) {
  const m = CLASSIC;
  return {
    x: b.x,
    y: m.playY + m.visR + b.z,
    z: m.throwZ - b.y,
  };
}

export function worldToSim(w: { x: number; y: number; z: number }) {
  const m = CLASSIC;
  return {
    x: w.x,
    y: m.throwZ - w.z,
    z: w.y - m.playY - m.visR,
  };
}

export function applyWorld(b: Ball, w: { x: number; y: number; z: number }) {
  const s = worldToSim(w);
  b.x = s.x;
  b.y = s.y;
  b.z = s.z;
}

function worldVel(b: Ball) {
  return { x: b.vx, y: b.vz, z: -b.vy };
}

function setWorldVel(b: Ball, w: { x: number; y: number; z: number }) {
  b.vx = w.x;
  b.vy = -w.z;
  b.vz = w.y;
}

function faceNormal() {
  const lean = CLASSIC.boardLean;
  return { x: 0, y: Math.sin(lean), z: Math.cos(lean) };
}

function reflectWorld(
  vx: number,
  vy: number,
  vz: number,
  nx: number,
  ny: number,
  nz: number,
  e: number,
) {
  const dot = vx * nx + vy * ny + vz * nz;
  if (dot >= 0) return { x: vx, y: vy, z: vz, hit: false, speedIn: 0 };
  return {
    x: vx - (1 + e) * dot * nx,
    y: vy - (1 + e) * dot * ny,
    z: vz - (1 + e) * dot * nz,
    hit: true,
    speedIn: -dot,
  };
}

export function launchKinematics(power: number, aimX: number, launchScale = 1) {
  const m = CLASSIC;
  const p = Math.max(0.12, Math.min(1, power));
  const speed = (m.launchMin + p * m.launchGain) * launchScale;
  return {
    x: aimX,
    y: 0.12,
    z: 0,
    vx: aimX * m.englishScale,
    vy: speed,
    vz: 0,
  };
}

export function applyLaunch(b: Ball, power: number, aimX: number, extraVx: number, launchScale = 1) {
  const k = launchKinematics(power, aimX, launchScale);
  b.x = k.x;
  b.y = k.y;
  b.z = k.z;
  b.vx = k.vx + extraVx;
  b.vy = k.vy;
  b.vz = k.vz;
  b.stage = "roll";
  b.alive = true;
  b.scored = false;
  b.rest = 0;
  b.sinkT = 0;
  b.troughT = 0;
}

export function railAt(y: number) {
  const m = CLASSIC;
  if (y <= m.flat) return m.alleyHalf;
  const u = rampU(m, y);
  return m.alleyHalf + (m.faceHalf - m.alleyHalf - 0.03) * u;
}

function woodE(flags: ThrowFlags) {
  return Math.max(0.06, Math.min(0.8, CLASSIC.woodRest + (flags.restitution - 0.16) * 0.85));
}

function rimE(flags: ThrowFlags) {
  return Math.max(0.16, Math.min(0.88, CLASSIC.rimRest + (flags.restitution - 0.16) * 0.7));
}

function nearestCup(lx: number, ly: number, holes: Hole[]) {
  let best: Hole | null = null;
  let bd = 9;
  for (const h of holes) {
    const hx = h.faceX ?? h.x;
    const hy = h.faceY ?? h.y;
    const d = Math.hypot(lx - hx, ly - hy);
    if (d < bd) {
      bd = d;
      best = h;
    }
  }
  return { hole: best, d: bd };
}

export function cupOpening(h: Hole) {
  return (h.faceR ?? h.r) * CLASSIC.captureScale;
}

export function overCup(lx: number, ly: number, h: Hole) {
  const hx = h.faceX ?? h.x;
  const hy = h.faceY ?? h.y;
  return Math.hypot(lx - hx, ly - hy) < cupOpening(h);
}

function startTrough(b: Ball) {
  b.stage = "trough";
  b.troughT = 0;
  b.vx = 0;
  b.vy = 0;
  b.vz = 0;
  b.alive = true;
}

function startSink(b: Ball, h: Hole) {
  b.stage = "sink";
  b.sinkT = 0;
  b.alive = true;
  b.faceX = h.faceX ?? h.x;
  b.faceY = h.faceY ?? h.y;
  b.vx = 0;
  b.vy = 0;
  b.vz = 0;
}

function magnetAccel(b: Ball, holes: Hole[], flags: ThrowFlags, dt: number) {
  if (!flags.magnet || holes.length === 0) return;
  const w = simToWorld(b);
  const loc = worldToBoard(w.x, w.y, w.z);
  const { hole } = nearestCup(loc.lx, loc.ly, holes);
  if (!hole) return;
  const t = boardLocalToWorld(hole.faceX ?? hole.x, hole.faceY ?? hole.y, CLASSIC.visR);
  const dx = t.x - w.x;
  const dy = t.y - w.y;
  const dz = t.z - w.z;
  const d = Math.hypot(dx, dy, dz) || 1;
  const a = 0.55;
  b.vx += (dx / d) * a * dt;
  b.vz += (dy / d) * a * dt;
  b.vy += (-dz / d) * a * dt;
}

function stepRoll(b: Ball, flags: ThrowFlags, extras: { windX: number }, dt: number): HitEvent[] {
  const m = CLASSIC;
  const hits: HitEvent[] = [];
  const yLip = lipY(m);
  const slope = rampSlope(m, b.y);
  const hyp2 = 1 + slope * slope;
  const gAlongY = (-m.g * slope) / hyp2;
  if (b.y > m.flat) b.vy += gAlongY * dt;
  else b.vy -= 0.04 * dt;
  if (flags.tailwind) b.vy += 0.28 * dt;
  b.vx += extras.windX * dt;
  const damp = Math.exp(-flags.friction * dt);
  b.vx *= damp;
  b.vy *= damp;
  b.x += b.vx * dt;
  b.y += b.vy * dt;
  b.spin += b.vx * 18 * dt;
  const rail = railAt(b.y) - b.r;
  if (b.x < -rail) {
    b.x = -rail;
    if (b.vx < 0) {
      b.vx = -b.vx * 0.45;
      hits.push({ kind: "wall", x: b.x, y: b.y, mag: Math.abs(b.vx) });
    }
  }
  if (b.x > rail) {
    b.x = rail;
    if (b.vx > 0) {
      b.vx = -b.vx * 0.45;
      hits.push({ kind: "wall", x: b.x, y: b.y, mag: Math.abs(b.vx) });
    }
  }
  if (b.y < 0.02) {
    b.y = 0.02;
    if (b.vy < 0) b.vy = 0;
  }
  const h = rampHeight(m, b.y);
  b.z = h;
  b.vz = slope * b.vy;
  if (b.y >= yLip - 0.004 && b.vy > 0.35) {
    b.y = yLip;
    b.z = m.rampRise;
    b.vz = slope * b.vy;
    b.stage = "air";
  } else if (b.y >= yLip - 0.004 && b.vy <= 0.35) {
    b.y = yLip - 0.006;
    b.vy = Math.min(b.vy, -0.15);
    b.z = rampHeight(m, b.y);
  }
  return hits;
}

function tryFaceHit(b: Ball, holes: Hole[], flags: ThrowFlags): HitEvent[] {
  const m = CLASSIC;
  const w = simToWorld(b);
  const loc = worldToBoard(w.x, w.y, w.z);
  const wv = worldVel(b);
  const N = faceNormal();
  const into = wv.x * N.x + wv.y * N.y + wv.z * N.z;
  const approaching = into < -0.02;
  if (loc.ly > m.headH + 0.03) return [];
  if (Math.abs(loc.lx) > m.headW * 0.52) return [];
  if (loc.ly < -0.08) return [];
  if (loc.lz > m.visR + 0.09) return [];

  const { hole, d } = nearestCup(loc.lx, loc.ly, holes);
  if (hole && overCup(loc.lx, loc.ly, hole) && loc.lz < m.visR + 0.055 && (approaching || loc.lz <= m.visR + 0.02)) {
    if (flags.superball && b.superSkip) {
      b.superSkip = false;
      const hx = hole.faceX ?? hole.x;
      const hy = hole.faceY ?? hole.y;
      const nx = (loc.lx - hx) / (d || 1);
      const ny = (loc.ly - hy) / (d || 1);
      const bounced = reflectWorld(wv.x, wv.y, wv.z, N.x, N.y, N.z, rimE(flags));
      bounced.x += nx * 1.15;
      bounced.y += ny * 0.35 * Math.cos(m.boardLean);
      bounced.z += -ny * 0.35 * Math.sin(m.boardLean);
      setWorldVel(b, bounced);
      b.stage = "air";
      return [{ kind: "peg", x: b.x, y: b.y, mag: 1.1 }];
    }
    startSink(b, hole);
    return [{ kind: "wall", x: b.x, y: b.y, mag: 0.25 }];
  }

  if (loc.lz > m.visR + 0.018) return [];
  if (!approaching && loc.lz > m.visR) return [];

  const hr = hole ? (hole.faceR ?? hole.r) : 0;
  const onRim = Boolean(hole && d < hr + m.rimWidth && d >= cupOpening(hole) * 0.92);
  const e = onRim ? rimE(flags) : woodE(flags);
  const bounced = reflectWorld(wv.x, wv.y, wv.z, N.x, N.y, N.z, e);
  if (onRim && hole) {
    const hx = hole.faceX ?? hole.x;
    const hy = hole.faceY ?? hole.y;
    const nx = (loc.lx - hx) / (d || 1);
    const ny = (loc.ly - hy) / (d || 1);
    bounced.x += nx * Math.max(0.25, bounced.speedIn * 0.18);
    bounced.y += ny * 0.16 * Math.cos(m.boardLean);
    bounced.z += -ny * 0.16 * Math.sin(m.boardLean);
  }
  const snapped = boardLocalToWorld(loc.lx, loc.ly, m.visR + 0.001);
  applyWorld(b, snapped);
  b.faceX = loc.lx;
  b.faceY = loc.ly;
  const stick = !onRim || bounced.speedIn < 1.8;
  if (stick) {
    const nn = bounced.x * N.x + bounced.y * N.y + bounced.z * N.z;
    setWorldVel(b, { x: bounced.x - nn * N.x, y: bounced.y - nn * N.y, z: bounced.z - nn * N.z });
    b.stage = "face";
  } else {
    setWorldVel(b, bounced);
    b.stage = "air";
  }
  return [{ kind: onRim ? "peg" : "wall", x: b.x, y: b.y, mag: bounced.speedIn }];
}

function stepAir(b: Ball, holes: Hole[], flags: ThrowFlags, extras: { windX: number }, dt: number): HitEvent[] {
  const m = CLASSIC;
  const hits: HitEvent[] = [];
  magnetAccel(b, holes, flags, dt);
  b.vx += extras.windX * dt;
  if (flags.tailwind) b.vy += 0.18 * dt;
  b.vz -= m.g * dt;
  b.x += b.vx * dt;
  b.y += b.vy * dt;
  b.z += b.vz * dt;
  b.spin += b.vx * 14 * dt;

  const yLip = lipY(m);
  if (b.y < yLip) {
    const h = rampHeight(m, b.y);
    if (b.z < h) {
      b.z = h;
      if (b.vz < 0) b.vz *= -0.22;
      b.stage = "roll";
      return hits;
    }
  }
  if (b.z < -0.35 || b.y > yLip + m.flightGap + 1.6) {
    startTrough(b);
    return hits;
  }

  hits.push(...tryFaceHit(b, holes, flags));
  return hits;
}

function stepFace(b: Ball, holes: Hole[], flags: ThrowFlags, extras: { windX: number }, dt: number): HitEvent[] {
  const m = CLASSIC;
  const hits: HitEvent[] = [];
  const w = simToWorld(b);
  const loc = worldToBoard(w.x, w.y, w.z);
  const { hole, d } = nearestCup(loc.lx, loc.ly, holes);
  if (hole && overCup(loc.lx, loc.ly, hole)) {
    if (flags.superball && b.superSkip) b.superSkip = false;
    else {
      startSink(b, hole);
      return hits;
    }
  }

  const lean = m.boardLean;
  const gLy = -m.g * Math.cos(lean);
  const wv = worldVel(b);
  const lyAxis = { x: 0, y: Math.cos(lean), z: -Math.sin(lean) };
  const lxAxis = { x: 1, y: 0, z: 0 };
  let vLx = wv.x * lxAxis.x + wv.y * lxAxis.y + wv.z * lxAxis.z;
  let vLy = wv.x * lyAxis.x + wv.y * lyAxis.y + wv.z * lyAxis.z;
  vLx += extras.windX * dt;
  vLy += gLy * dt;
  const damp = Math.exp(-m.faceFriction * flags.friction * 2.4 * dt);
  vLx *= damp;
  vLy *= damp;

  let lx = loc.lx + vLx * dt;
  let ly = loc.ly + vLy * dt;
  const side = m.faceHalf - 0.02;
  if (lx < -side) {
    lx = -side;
    vLx = Math.abs(vLx) * 0.35;
  }
  if (lx > side) {
    lx = side;
    vLx = -Math.abs(vLx) * 0.35;
  }

  if (hole && d < (hole.faceR ?? hole.r) + m.rimWidth && !overCup(lx, ly, hole) && Math.hypot(vLx, vLy) > 0.35) {
    hits.push({ kind: "peg", x: b.x, y: b.y, mag: Math.hypot(vLx, vLy) });
  }

  const snapped = boardLocalToWorld(lx, ly, m.visR);
  applyWorld(b, snapped);
  setWorldVel(b, {
    x: lxAxis.x * vLx + lyAxis.x * vLy,
    y: lxAxis.y * vLx + lyAxis.y * vLy,
    z: lxAxis.z * vLx + lyAxis.z * vLy,
  });
  b.faceX = lx;
  b.faceY = ly;
  b.spin += vLx * 16 * dt;

  if (ly < 0.02 || (ly < 0.06 && Math.hypot(vLx, vLy) < 0.12)) startTrough(b);
  if (ly > m.headH + 0.02) b.stage = "air";
  return hits;
}

function stepSink(b: Ball, dt: number) {
  const m = CLASSIC;
  b.sinkT = (b.sinkT ?? 0) + dt;
  const u = Math.min(1, b.sinkT / m.sinkTime);
  const lx = b.faceX ?? 0;
  const ly = b.faceY ?? m.faceCy;
  const world = boardLocalToWorld(lx, ly, m.visR - u * 0.16);
  applyWorld(b, world);
  if (u >= 1) startTrough(b);
}

function stepTrough(b: Ball, dt: number) {
  const m = CLASSIC;
  b.troughT = (b.troughT ?? 0) + dt;
  const u = Math.min(1, b.troughT / m.troughTime);
  const e = u * u * (3 - 2 * u);
  const y0 = lipY(m) + m.flightGap * 0.15;
  const y1 = 0.22;
  b.x = m.alleyHalf + 0.13;
  b.y = y0 + (y1 - y0) * e;
  b.z = -0.12 + e * 0.04;
  b.spin += 8 * dt;
  if (u >= 1) {
    b.alive = false;
    b.stage = "trough";
  }
}

export function isInTransit(b: Pick<Ball, "alive" | "stage">) {
  return b.alive && (b.stage === "sink" || b.stage === "trough");
}

export function stepMachine(
  b: Ball,
  holes: Hole[],
  flags: ThrowFlags,
  extras: { windX: number },
  dt: number,
): HitEvent[] {
  if (!b.alive) return [];
  if (b.stage === "sink") {
    stepSink(b, dt);
    return [];
  }
  if (b.stage === "trough") {
    stepTrough(b, dt);
    return [];
  }
  if (b.scored) return [];

  const hits: HitEvent[] = [];
  const speed = Math.hypot(b.vx, b.vy, b.vz);
  const n = Math.max(1, Math.ceil((speed * dt) / 0.01));
  const hdt = dt / n;
  for (let i = 0; i < n; i++) {
    if (b.stage === "air") hits.push(...stepAir(b, holes, flags, extras, hdt));
    else if (b.stage === "face") hits.push(...stepFace(b, holes, flags, extras, hdt));
    else hits.push(...stepRoll(b, flags, extras, hdt));
    if (!b.alive || b.scored) break;
    if (b.stage !== "air" && b.stage !== "face" && b.stage !== "roll") break;
  }
  const s = Math.hypot(b.vx, b.vy, b.vz);
  if (s > MAX_SPEED) {
    const k = MAX_SPEED / s;
    b.vx *= k;
    b.vy *= k;
    b.vz *= k;
  }
  return hits;
}

export type ThrowResult = {
  scored: number | null;
  hole: Hole | null;
  reason: "cup" | "gutter" | "timeout";
  time: number;
  path: Array<{ x: number; y: number; z: number; stage: string }>;
  maxHeight: number;
  contacted: boolean;
};

function idleFlags(): ThrowFlags {
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

export function simulateThrow(opts: {
  power: number;
  aimX?: number;
  extraVx?: number;
  holes: Hole[];
  flags?: ThrowFlags;
  dt?: number;
  maxTime?: number;
  windX?: number;
  record?: boolean;
}): ThrowResult {
  const flags = opts.flags ?? idleFlags();
  const dt = opts.dt ?? 1 / 60;
  const maxTime = opts.maxTime ?? 6;
  const b: Ball = {
    x: 0,
    y: 0.12,
    z: 0,
    vx: 0,
    vy: 0,
    vz: 0,
    r: 0.036,
    spin: 0,
    alive: true,
    scored: false,
    rest: 0,
    superSkip: flags.superball,
    stage: "air",
  };
  applyLaunch(b, opts.power, opts.aimX ?? 0, opts.extraVx ?? 0, flags.launchScale);
  const path: ThrowResult["path"] = [];
  let t = 0;
  let maxHeight = b.z;
  let contacted = false;
  let hole: Hole | null = null;
  while (t < maxTime && b.alive) {
    const hits = stepMachine(b, opts.holes, flags, { windX: opts.windX ?? 0 }, dt);
    if (hits.some((h) => h.kind === "wall" || h.kind === "peg")) contacted = true;
    if (b.z > maxHeight) maxHeight = b.z;
    if (opts.record && path.length < 80) path.push({ x: b.x, y: b.y, z: b.z, stage: b.stage ?? "roll" });
    if (b.stage === "sink" && hole == null) {
      hole =
        opts.holes.find(
          (h) => Math.abs((h.faceX ?? h.x) - (b.faceX ?? 0)) < 1e-4 && Math.abs((h.faceY ?? h.y) - (b.faceY ?? 0)) < 1e-4,
        ) ?? null;
    }
    t += dt;
    if (b.stage === "trough" && (b.troughT ?? 0) >= CLASSIC.troughTime - dt * 0.5) break;
  }
  const scored = hole ? hole.value : null;
  const reason: ThrowResult["reason"] = scored != null ? "cup" : t >= maxTime ? "timeout" : "gutter";
  return { scored, hole, reason, time: t, path, maxHeight, contacted };
}

export function rampSegments(n = 7) {
  const m = CLASSIC;
  const segs: Array<{ midY: number; midZ: number; len: number; tilt: number }> = [];
  for (let i = 0; i < n; i++) {
    const y0 = m.flat + (i / n) * m.rampRun;
    const y1 = m.flat + ((i + 1) / n) * m.rampRun;
    const h0 = rampHeight(m, y0);
    const h1 = rampHeight(m, y1);
    segs.push({
      midY: m.playY + (h0 + h1) / 2,
      midZ: m.throwZ - (y0 + y1) / 2,
      len: Math.hypot(y1 - y0, h1 - h0),
      tilt: Math.atan2(h1 - h0, y1 - y0),
    });
  }
  return segs;
}

export function troughWorld(u: number) {
  const m = CLASSIC;
  const e = Math.max(0, Math.min(1, u));
  const s = e * e * (3 - 2 * e);
  const y0 = lipY(m) + m.flightGap * 0.15;
  const y1 = 0.22;
  const y = y0 + (y1 - y0) * s;
  return {
    x: m.alleyHalf + 0.13,
    y: m.playY - 0.08,
    z: m.throwZ - y,
  };
}
