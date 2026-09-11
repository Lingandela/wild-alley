import type { Hole, LaneDef } from "./types";
import { heightAt } from "./physics";

/** Classic skee-ball table in meters. Thrower stands at +Z looking −Z. */
export const PLAY_Y = 0.86;
export const HALF_W = 0.34;
/** Playable half-width on the scoring head (meters). 100s at ±0.46 sit inside this. */
export const FACE_HALF = 0.52;
export const BALL_R3 = 0.048;
export const THROW_Z = 1.18;
export const CAB_W = 1.08;
export const CAB_FRONT = 0.38;
export const FLAT = 2.2;
export const RAMP_RUN = 0.62;
export const RAMP_RISE = 0.44;
/** Lean back from vertical so the face reads to the thrower. */
export const BOARD_LEAN = 0.18;
/** Circular target on the wooden head. Center = 50-point cup. */
export const FACE_R = 0.56;
export const FACE_CY = 0.54;
export const HEAD_W = 1.22;
export const HEAD_H = 1.36;
/** Fraction of post-lip distance that is the ramp (rest is the scoring face). */
export const RAMP_T = 0.14;
export const SPAWN = { x: 0.0, y: 0.8, z: 4.2 };
export const SEAT = { x: 0, y: 0.8, z: THROW_Z + 0.86 };

/** Walkable parlor extents (meters). Shared by room colliders and fall-out. */
export const PARLOR = { wall: 6.55, zBack: -10.4, zFront: 7.0, ceil: 4.05 };

export const COL = {
  static: 0,
  player: 1,
} as const;

/** Concentric ring radii on the face (board-local, centered at FACE_CY). */
export const SKEE_RINGS = [0.54, 0.4, 0.28, 0.16];

/**
 * Real skee-ball anatomy (Skee-Ball Inc / arcade target):
 *   - circular target with concentric rings
 *   - 50 in the center, then 40 / 30 / 20 / 10 stacked down the midline
 *   - 10 is the large bottom catch
 *   - 100s sit in the top corners of the wooden head, outside the circle
 * Board-local: +X right, +Y up the face.
 */
export const SKEE_CUPS: Array<{
  value: number;
  lx: number;
  ly: number;
  r: number;
  special?: Hole["special"];
  captureEasy?: boolean;
}> = [
  { value: 100, lx: -0.46, ly: 1.12, r: 0.05, special: "plinko" },
  { value: 100, lx: 0.46, ly: 1.12, r: 0.05 },
  { value: 50, lx: 0, ly: 0.54, r: 0.05 },
  { value: 40, lx: 0, ly: 0.4, r: 0.054 },
  { value: 30, lx: 0, ly: 0.29, r: 0.058 },
  { value: 20, lx: 0, ly: 0.19, r: 0.064, captureEasy: true },
  { value: 10, lx: 0, ly: 0.09, r: 0.082, captureEasy: true },
];

export function xWorld(lane: LaneDef, x: number) {
  if (usesBackboard(lane.theme)) return x;
  return (x / lane.rail) * HALF_W;
}

export function rampStartZ() {
  return THROW_Z - FLAT;
}

export function rampEndZ() {
  return THROW_Z - FLAT - RAMP_RUN;
}

export function usesBackboard(theme: LaneDef["theme"]) {
  return theme === "classic" || theme === "pinball" || theme === "chaos";
}

export function hillLift(lane: LaneDef, x: number, y: number) {
  return heightAt(x, y, lane.hills) * 0.55;
}

export function boardOrigin() {
  return {
    x: 0,
    y: PLAY_Y + RAMP_RISE + 0.02,
    z: rampEndZ() - 0.02,
  };
}

/** Board local: +X right, +Y up the face, +Z toward the thrower. */
export function boardLocalToWorld(lx: number, ly: number, lz: number) {
  const o = boardOrigin();
  const th = -BOARD_LEAN;
  const c = Math.cos(th);
  const s = Math.sin(th);
  return {
    x: o.x + lx,
    y: o.y + ly * c - lz * s,
    z: o.z + ly * s + lz * c,
  };
}

function postLipT(lane: LaneDef, y: number) {
  return (y - lane.lipY) / Math.max(0.08, lane.length - lane.lipY);
}

/** Local Y on the scoring face. 0.08 near the lip, ~1.06 at the 100s. */
export function faceLocalY(lane: LaneDef, y: number) {
  const t = postLipT(lane, y);
  const u = Math.max(0, Math.min(1, (t - RAMP_T) / (1 - RAMP_T)));
  return 0.08 + u * 0.98;
}

export function faceToLane(lane: LaneDef, lx: number, ly: number, r: number) {
  const u = Math.max(0, Math.min(1, (ly - 0.08) / 0.98));
  const t = RAMP_T + u * (1 - RAMP_T);
  return {
    x: lx,
    y: lane.lipY + t * (lane.length - lane.lipY),
    r,
  };
}

export function skeeHolesFor(lane: LaneDef): Hole[] {
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

export function ballWorld(lane: LaneDef, b: { x: number; y: number; z: number }) {
  const x = xWorld(lane, b.x);
  const air = Math.max(0, b.z);
  if (!usesBackboard(lane.theme) || b.y <= lane.lipY) {
    const t = Math.max(0, Math.min(1, b.y / Math.max(0.05, lane.lipY)));
    const z = THROW_Z - t * FLAT;
    const y = PLAY_Y + BALL_R3 + hillLift(lane, b.x, b.y) + air * 0.7;
    return { x, y, z };
  }
  const t = postLipT(lane, b.y);
  if (t < RAMP_T) {
    const u = Math.max(0, t) / RAMP_T;
    const s = u * u * (3 - 2 * u);
    return {
      x,
      y: PLAY_Y + BALL_R3 + s * RAMP_RISE + air * 0.45,
      z: rampStartZ() - s * RAMP_RUN,
    };
  }
  const ly = faceLocalY(lane, b.y);
  if (air > 0.03) {
    const face = boardLocalToWorld(x, ly, BALL_R3);
    return { x: face.x, y: face.y + air * 0.55, z: face.z };
  }
  return boardLocalToWorld(x, ly, BALL_R3 + 0.03);
}

export function holeWorld(lane: LaneDef, hole: Hole) {
  if (usesBackboard(lane.theme)) {
    const lx = hole.faceX ?? xWorld(lane, hole.x);
    const ly = hole.faceY ?? faceLocalY(lane, hole.y);
    const vis = hole.faceR ?? Math.max(0.09, Math.min(0.175, 0.165 - hole.value * 0.0006));
    return { ...boardLocalToWorld(lx, ly, 0.04), r: vis, onBoard: true, lx, ly };
  }
  const p = ballWorld(lane, { x: hole.x, y: hole.y, z: 0 });
  return {
    x: p.x,
    y: PLAY_Y + 0.012 + hillLift(lane, hole.x, hole.y),
    z: p.z,
    r: Math.max(0.09, hole.r * 2.2),
    onBoard: false,
    lx: 0,
    ly: 0,
  };
}

export function bumperWorld(lane: LaneDef, b: { x: number; y: number; r: number }) {
  const p = ballWorld(lane, { x: b.x, y: b.y, z: 0 });
  return { x: p.x, y: PLAY_Y + 0.09 + hillLift(lane, b.x, b.y), z: p.z, r: Math.max(0.05, b.r * 1.4) };
}

export function hillWorld(lane: LaneDef, h: { x: number; y: number; r: number; h: number }) {
  const p = ballWorld(lane, { x: h.x, y: h.y, z: 0 });
  return { x: p.x, y: PLAY_Y, z: p.z, r: h.r * (HALF_W / lane.rail) * 1.15, height: h.h * 0.7 };
}

export function crateWorld(lane: LaneDef, c: { x: number; y: number; w: number; h: number }) {
  const p = ballWorld(lane, { x: c.x, y: c.y, z: 0 });
  return { x: p.x, y: PLAY_Y + 0.1, z: p.z, w: c.w * 1.35, d: c.h * 1.7, hh: 0.18 };
}

export function seatEye() {
  return { x: 0, y: 1.46, z: THROW_Z + 0.62 };
}

export function seatLook() {
  const o = boardOrigin();
  return { x: 0, y: o.y + FACE_CY, z: o.z + 0.14 };
}

export function nearCabinet(x: number, z: number) {
  return Math.abs(x) < 0.95 && z < THROW_Z + 1.9 && z > THROW_Z - 0.35;
}

export function themeFelt(theme: LaneDef["theme"]) {
  if (theme === "golf") return "#355838";
  if (theme === "pinball") return "#2a2440";
  if (theme === "chaos") return "#2c1818";
  if (theme === "long") return "#6b4a28";
  return "#7a4a2c";
}

export function themeCabinet(theme: LaneDef["theme"]) {
  if (theme === "golf") return { body: "#2a3a28", stripe: "#c4a048", rail: "#efe6d4" };
  if (theme === "pinball") return { body: "#24182e", stripe: "#c47a3a", rail: "#c45c48" };
  if (theme === "chaos") return { body: "#1a1012", stripe: "#c45c48", rail: "#efe6d4" };
  if (theme === "long") return { body: "#3a2818", stripe: "#c47a3a", rail: "#c45c48" };
  return { body: "#6a241c", stripe: "#c45c48", rail: "#efe6d4" };
}
