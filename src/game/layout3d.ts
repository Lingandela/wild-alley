import type { Hole, LaneDef } from "./types";
import { heightAt } from "./physics";

/** Classic skee-ball table in meters. Thrower stands at +Z looking −Z. */
export const PLAY_Y = 0.86;
export const HALF_W = 0.34;
export const BALL_R3 = 0.048;
export const THROW_Z = 1.18;
export const CAB_W = 1.08;
export const CAB_FRONT = 0.38;
export const FLAT = 3.05;
export const RAMP_RUN = 0.72;
export const RAMP_RISE = 0.48;
/** Lean back from vertical so cups face the thrower. */
export const BOARD_LEAN = 0.22;
export const FACE_R = 0.64;
export const FACE_CY = 0.58;
/** Fraction of post-lip distance that is the ramp (rest is the scoring face). */
export const RAMP_T = 0.14;
export const SPAWN = { x: 0.0, y: 0.8, z: 3.55 };
export const SEAT = { x: 0, y: 0.8, z: THROW_Z + 0.82 };

export const COL = {
  static: 0,
  player: 1,
} as const;

export function xWorld(lane: LaneDef, x: number) {
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

/** Local Y on the scoring face. 0.14 near the lip, ~1.16 at the 100. */
export function faceLocalY(lane: LaneDef, y: number) {
  const t = postLipT(lane, y);
  const u = Math.max(0, Math.min(1, (t - RAMP_T) / (1 - RAMP_T)));
  return 0.14 + u * FACE_R * 1.6;
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
    return {
      x,
      y: PLAY_Y + BALL_R3 + u * RAMP_RISE + air * 0.45,
      z: rampStartZ() - u * RAMP_RUN,
    };
  }
  const ly = faceLocalY(lane, b.y);
  return boardLocalToWorld(x, ly, BALL_R3 + 0.03 + air * 0.35);
}

export function holeWorld(lane: LaneDef, hole: Hole) {
  if (usesBackboard(lane.theme)) {
    const lx = xWorld(lane, hole.x);
    const ly = faceLocalY(lane, hole.y);
    const vis = Math.max(0.09, Math.min(0.175, 0.165 - hole.value * 0.0006));
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
  return { x: 0, y: 1.42, z: THROW_Z + 0.78 };
}

export function seatLook() {
  const o = boardOrigin();
  return { x: 0, y: o.y + FACE_CY * 0.55, z: o.z + 0.28 };
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
