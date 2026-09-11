import type { Ball, Hole, ThrowFlags } from "./types";
import { BALL_R } from "./types";
import { FACE_HALF, SKEE_CUPS, faceToLane } from "./layout3d";
import type { LaneDef } from "./types";

/** Ball must be this close to the wood (sim z) before a cup can swallow it. */
export const CONTACT_Z = 0.055;
/** Splitter waits until the lead ball is this far down the alley. */
export const SPLIT_Y = 0.55;
/** Alley gutter half-width in meters (sim x). */
export const ALLEY_PLAY = 0.34;

export function xLimit(y: number, lipY: number, alley = ALLEY_PLAY, face = FACE_HALF) {
  return y > lipY ? face : alley;
}

export function isReachableX(x: number, y: number, lipY: number) {
  return Math.abs(x) <= xLimit(y, lipY) - 0.012;
}

/** Planar overlap plus contact-height. Airborne plan-view hits do not score. */
export function canCapture(b: Pick<Ball, "x" | "y" | "z" | "r" | "vx" | "vy" | "alive" | "scored">, h: Hole) {
  if (!b.alive || b.scored) return false;
  if (b.z > CONTACT_Z) return false;
  const d = Math.hypot(b.x - h.x, b.y - h.y);
  const reach = Math.max(0.01, h.r - b.r * 0.08);
  if (d > reach) return false;
  const speed = Math.hypot(b.vx, b.vy);
  const easy = h.captureEasy || speed < (h.value >= 80 ? 1.55 : 2.15);
  const dead = d < h.r * 0.48;
  return easy || dead;
}

export function shouldSplitNow(lead: Pick<Ball, "y" | "alive" | "scored">, flags: Pick<ThrowFlags, "split">, already: boolean) {
  return Boolean(flags.split) && !already && lead.alive && !lead.scored && lead.y >= SPLIT_Y;
}

export function syncHoleLabels(holes: Hole[]) {
  for (const h of holes) {
    if (h.label === "OUT" || h.label === "PIN") continue;
    h.label = String(h.value);
  }
}

export function applyWide(holes: Hole[], scale = 1.22) {
  for (const h of holes) {
    h.r *= scale;
    if (h.faceR != null) h.faceR *= scale;
  }
}

export function classicHolesFor(lane: LaneDef): Hole[] {
  return SKEE_CUPS.map((c) => {
    const p = faceToLane(lane, c.lx, c.ly, c.r);
    return {
      x: p.x,
      y: p.y,
      r: p.r,
      value: c.value,
      label: String(c.value),
      special: c.special,
      captureEasy: c.captureEasy,
      faceX: c.lx,
      faceY: c.ly,
      faceR: c.r,
    };
  });
}

export function simMatchesFace(h: Hole) {
  if (h.faceX == null) return true;
  return Math.abs(h.x - h.faceX) < 1e-6;
}

export function makeTestBall(x: number, y: number, z = 0): Ball {
  return {
    x,
    y,
    z,
    vx: 0,
    vy: 0,
    vz: 0,
    r: BALL_R,
    spin: 0,
    alive: true,
    scored: false,
    rest: 0,
    superSkip: false,
  };
}
