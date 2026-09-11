import { MAX_SPEED } from "./types";
import type { Ball, Bumper, Crate, Hill, Peg, Seg, Spinner } from "./types";

export function clamp(v: number, a: number, b: number) {
  return Math.max(a, Math.min(b, v));
}

export function hypot2(x: number, y: number) {
  return x * x + y * y;
}

export function reflect(vx: number, vy: number, nx: number, ny: number, e: number) {
  const dot = vx * nx + vy * ny;
  if (dot >= 0) return { vx, vy, hit: false, speedIn: 0 };
  return {
    vx: vx - (1 + e) * dot * nx,
    vy: vy - (1 + e) * dot * ny,
    hit: true,
    speedIn: -dot,
  };
}

export function circleSegment(
  cx: number,
  cy: number,
  r: number,
  ax: number,
  ay: number,
  bx: number,
  by: number,
) {
  const abx = bx - ax;
  const aby = by - ay;
  const apx = cx - ax;
  const apy = cy - ay;
  const ab2 = abx * abx + aby * aby || 1e-8;
  const t = clamp((apx * abx + apy * aby) / ab2, 0, 1);
  const px = ax + t * abx;
  const py = ay + t * aby;
  const dx = cx - px;
  const dy = cy - py;
  const d2 = dx * dx + dy * dy;
  if (d2 >= r * r || d2 === 0) return null;
  const d = Math.sqrt(d2);
  return { nx: dx / d, ny: dy / d, pen: r - d, px, py };
}

export function circleAabb(cx: number, cy: number, r: number, box: Crate) {
  const hx = box.w * 0.5;
  const hy = box.h * 0.5;
  const nx = clamp(cx, box.x - hx, box.x + hx);
  const ny = clamp(cy, box.y - hy, box.y + hy);
  const dx = cx - nx;
  const dy = cy - ny;
  const d2 = dx * dx + dy * dy;
  if (d2 >= r * r) return null;
  if (d2 === 0) {
    const dl = cx - (box.x - hx);
    const dr = box.x + hx - cx;
    const db = cy - (box.y - hy);
    const dt = box.y + hy - cy;
    const m = Math.min(dl, dr, db, dt);
    if (m === dl) return { nx: -1, ny: 0, pen: r + dl };
    if (m === dr) return { nx: 1, ny: 0, pen: r + dr };
    if (m === db) return { nx: 0, ny: -1, pen: r + db };
    return { nx: 0, ny: 1, pen: r + dt };
  }
  const d = Math.sqrt(d2);
  return { nx: dx / d, ny: dy / d, pen: r - d };
}

export function hillAccel(x: number, y: number, hills: Hill[], g: number) {
  let ax = 0;
  let ay = 0;
  for (const h of hills) {
    const dx = x - h.x;
    const dy = y - h.y;
    const r2 = h.r * h.r;
    const d2 = dx * dx + dy * dy;
    if (d2 > r2 * 4) continue;
    const w = Math.exp(-d2 / (2 * r2));
    const s = (g * h.h * w) / r2;
    ax += s * dx;
    ay += s * dy;
  }
  return { ax, ay };
}

export function heightAt(x: number, y: number, hills: Hill[]) {
  let z = 0;
  for (const h of hills) {
    const dx = x - h.x;
    const dy = y - h.y;
    const r2 = h.r * h.r;
    z += h.h * Math.exp(-(dx * dx + dy * dy) / (2 * r2));
  }
  return z;
}

export type World = {
  rail: number;
  alleyRail?: number;
  faceRail?: number;
  length: number;
  lipY: number;
  segs: Seg[];
  bumpers: Bumper[];
  pegs: Peg[];
  hills: Hill[];
  spinners: Spinner[];
  crates: Crate[];
  oil?: { x: number; y: number; r: number };
};

export function makeBall(x: number, y: number, r = 0.036): Ball {
  return {
    x,
    y,
    z: 0,
    vx: 0,
    vy: 0,
    vz: 0,
    r,
    spin: 0,
    alive: true,
    scored: false,
    rest: 0,
    superSkip: false,
  };
}

export function capSpeed(b: Ball) {
  const s = Math.hypot(b.vx, b.vy, b.vz);
  if (s > MAX_SPEED) {
    const k = MAX_SPEED / s;
    b.vx *= k;
    b.vy *= k;
    b.vz *= k;
  }
}

export type HitEvent = { kind: "bumper" | "peg" | "wall" | "spinner" | "crate"; x: number; y: number; mag: number };

export function stepBall(
  b: Ball,
  world: World,
  dt: number,
  rest: number,
  friction: number,
  extras: { magnetX?: number; magnetY?: number; windX?: number; windY?: number; wellX?: number; wellY?: number },
): HitEvent[] {
  if (!b.alive || b.scored) return [];
  const hits: HitEvent[] = [];
  const speed = Math.hypot(b.vx, b.vy);
  const n = Math.max(1, Math.ceil((speed * dt) / (b.r * 0.35)));
  const hdt = dt / n;

  for (let i = 0; i < n; i++) {
    const ha = hillAccel(b.x, b.y, world.hills, 5.4);
    b.vx += ha.ax * hdt;
    b.vy += ha.ay * hdt;
    if (b.y > world.lipY) b.vy -= 2.55 * hdt;
    else b.vy -= 0.05 * hdt;
    if (extras.magnetX != null && extras.magnetY != null) {
      const dx = extras.magnetX - b.x;
      const dy = extras.magnetY - b.y;
      const d = Math.hypot(dx, dy) || 1;
      b.vx += (dx / d) * 0.45 * hdt;
      b.vy += (dy / d) * 0.45 * hdt;
    }
    if (extras.windX) b.vx += extras.windX * hdt;
    if (extras.windY) b.vy += extras.windY * hdt;
    if (extras.wellX != null && extras.wellY != null) {
      const dx = extras.wellX - b.x;
      const dy = extras.wellY - b.y;
      const d = Math.hypot(dx, dy) || 1;
      b.vx += (dx / d) * 1.15 * hdt;
      b.vy += (dy / d) * 1.15 * hdt;
    }

    let fr = friction;
    if (world.oil) {
      const od = hypot2(b.x - world.oil.x, b.y - world.oil.y);
      if (od < world.oil.r * world.oil.r) fr *= 0.28;
    }
    const damp = Math.exp(-fr * hdt);
    b.vx *= damp;
    b.vy *= damp;

    b.x += b.vx * hdt;
    b.y += b.vy * hdt;
    b.spin += b.vx * 18 * hdt;

    if (b.z > 0 || b.vz > 0) {
      b.vz -= 9.2 * hdt;
      b.z += b.vz * hdt;
      if (b.z < 0) {
        b.z = 0;
        b.vz *= -0.25;
        if (Math.abs(b.vz) < 0.4) b.vz = 0;
      }
    }

    for (const s of world.segs) {
      const hit = circleSegment(b.x, b.y, b.r, s.ax, s.ay, s.bx, s.by);
      if (!hit) continue;
      b.x += hit.nx * hit.pen;
      b.y += hit.ny * hit.pen;
      const rf = reflect(b.vx, b.vy, hit.nx, hit.ny, rest * 0.62);
      b.vx = rf.vx;
      b.vy = rf.vy;
      if (rf.hit && rf.speedIn > 0.4) hits.push({ kind: "wall", x: b.x, y: b.y, mag: rf.speedIn });
    }

    const side = b.y > world.lipY ? (world.faceRail ?? world.rail) : (world.alleyRail ?? world.rail);
    if (b.x < -side + b.r) {
      b.x = -side + b.r;
      if (b.vx < 0) {
        const rf = reflect(b.vx, b.vy, 1, 0, rest * 0.55);
        b.vx = rf.vx;
        b.vy = rf.vy;
      }
    }
    if (b.x > side - b.r) {
      b.x = side - b.r;
      if (b.vx > 0) {
        const rf = reflect(b.vx, b.vy, -1, 0, rest * 0.55);
        b.vx = rf.vx;
        b.vy = rf.vy;
      }
    }
    if (b.y > world.length - b.r) {
      b.y = world.length - b.r;
      if (b.vy > 0) {
        const rf = reflect(b.vx, b.vy, 0, -1, rest * 0.4);
        b.vx = rf.vx;
        b.vy = rf.vy;
        if (rf.hit) hits.push({ kind: "wall", x: b.x, y: b.y, mag: rf.speedIn });
      }
    }

    for (const bumper of world.bumpers) {
      const dx = b.x - bumper.x;
      const dy = b.y - bumper.y;
      const min = b.r + bumper.r;
      const d2 = dx * dx + dy * dy;
      if (d2 >= min * min || d2 === 0) continue;
      const d = Math.sqrt(d2);
      const nx = dx / d;
      const ny = dy / d;
      b.x = bumper.x + nx * min;
      b.y = bumper.y + ny * min;
      const rf = reflect(b.vx, b.vy, nx, ny, rest * bumper.impulse);
      b.vx = rf.vx + nx * 0.55;
      b.vy = rf.vy + ny * 0.55;
      hits.push({ kind: "bumper", x: bumper.x, y: bumper.y, mag: Math.max(rf.speedIn, 0.8) });
    }

    for (const peg of world.pegs) {
      const dx = b.x - peg.x;
      const dy = b.y - peg.y;
      const min = b.r + peg.r;
      const d2 = dx * dx + dy * dy;
      if (d2 >= min * min || d2 === 0) continue;
      const d = Math.sqrt(d2);
      const nx = dx / d;
      const ny = dy / d;
      b.x = peg.x + nx * min;
      b.y = peg.y + ny * min;
      const rf = reflect(b.vx, b.vy, nx, ny, rest * 0.95);
      b.vx = rf.vx;
      b.vy = rf.vy;
      if (rf.hit) hits.push({ kind: "peg", x: peg.x, y: peg.y, mag: rf.speedIn });
    }

    for (const sp of world.spinners) {
      for (let k = 0; k < sp.blades; k++) {
        const a = sp.angle + (k * Math.PI * 2) / sp.blades;
        const bx = sp.x + Math.cos(a) * sp.len;
        const by = sp.y + Math.sin(a) * sp.len;
        const hit = circleSegment(b.x, b.y, b.r, sp.x, sp.y, bx, by);
        if (!hit) continue;
        b.x += hit.nx * hit.pen;
        b.y += hit.ny * hit.pen;
        const tangX = -Math.sin(a) * sp.omega * sp.len;
        const tangY = Math.cos(a) * sp.omega * sp.len;
        const rf = reflect(b.vx - tangX, b.vy - tangY, hit.nx, hit.ny, rest * 0.8);
        b.vx = rf.vx + tangX;
        b.vy = rf.vy + tangY;
        hits.push({ kind: "spinner", x: b.x, y: b.y, mag: 1 });
      }
    }

    for (const crate of world.crates) {
      const hit = circleAabb(b.x, b.y, b.r, crate);
      if (!hit) continue;
      b.x += hit.nx * hit.pen;
      b.y += hit.ny * hit.pen;
      const rf = reflect(b.vx, b.vy, hit.nx, hit.ny, rest * 0.45);
      b.vx = rf.vx;
      b.vy = rf.vy;
      if (rf.hit) hits.push({ kind: "crate", x: b.x, y: b.y, mag: rf.speedIn });
    }
  }

  capSpeed(b);
  return hits;
}

export function railsFor(rail: number, length: number, opts?: { cap?: boolean }): Seg[] {
  const segs: Seg[] = [
    { ax: -rail, ay: 0.02, bx: -rail, by: length },
    { ax: rail, ay: 0.02, bx: rail, by: length },
  ];
  if (opts?.cap !== false) segs.push({ ax: -rail, ay: length, bx: rail, by: length });
  return segs;
}
