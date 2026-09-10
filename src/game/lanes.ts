import type { Hole, LaneDef } from "./types";
import { skeeHolesFor } from "./layout3d";

function cup(x: number, y: number, r: number, value: number, extra?: Partial<Hole>): Hole {
  return { x, y, r, value, ...extra };
}

export const LANES: LaneDef[] = [
  {
    id: "fairground",
    name: "The Fairground",
    blurb: "A honest alley. Until it isn't.",
    theme: "classic",
    length: 2.58,
    width: 1,
    rail: 0.4,
    lipY: 1.05,
    holes: [],
    bumpers: [],
    pegs: [],
    hills: [],
    spinners: [],
    crates: [],
    steer: 0.55,
  },
  {
    id: "windmill",
    name: "Windmill Green",
    blurb: "Mini-golf with a mean mill.",
    theme: "golf",
    length: 2.7,
    width: 1,
    rail: 0.42,
    lipY: 2.7,
    holes: [
      cup(0.18, 2.42, 0.08, 100, { special: "plinko", label: "100" }),
      cup(-0.16, 2.18, 0.09, 50),
      cup(0.02, 1.72, 0.09, 30),
      cup(-0.22, 1.28, 0.1, 20),
      cup(0.22, 0.92, 0.1, 10, { captureEasy: true }),
    ],
    bumpers: [],
    pegs: [],
    hills: [
      { x: 0.08, y: 0.7, r: 0.28, h: 0.16 },
      { x: -0.14, y: 1.5, r: 0.32, h: 0.2 },
      { x: 0.12, y: 2.0, r: 0.22, h: 0.12 },
    ],
    spinners: [{ x: 0.18, y: 2.22, len: 0.16, omega: 1.6, angle: 0, blades: 4 }],
    crates: [],
    steer: 0.9,
  },
  {
    id: "tilt",
    name: "Tilt Carnival",
    blurb: "Bumpers, pegs, and a pin-cup.",
    theme: "pinball",
    length: 2.62,
    width: 1,
    rail: 0.4,
    lipY: 1.12,
    holes: [
      cup(0, 2.42, 0.07, 100, { special: "pinball", label: "PIN" }),
      cup(-0.18, 2.18, 0.078, 50),
      cup(0.18, 2.18, 0.078, 50),
      cup(0, 1.92, 0.082, 40),
      cup(-0.22, 1.68, 0.085, 20),
      cup(0.22, 1.68, 0.085, 20),
      cup(0, 1.42, 0.092, 10, { captureEasy: true }),
    ],
    bumpers: [
      { x: -0.16, y: 0.95, r: 0.07, impulse: 1.55 },
      { x: 0.16, y: 0.95, r: 0.07, impulse: 1.55 },
      { x: 0, y: 1.22, r: 0.065, impulse: 1.7 },
    ],
    pegs: [
      { x: -0.22, y: 0.55, r: 0.028 },
      { x: 0.22, y: 0.55, r: 0.028 },
      { x: -0.1, y: 0.72, r: 0.026 },
      { x: 0.1, y: 0.72, r: 0.026 },
    ],
    hills: [],
    spinners: [],
    crates: [],
    steer: 0.7,
  },
  {
    id: "longroll",
    name: "The Long Roll",
    blurb: "Steer the ridges. Don't fall off the world.",
    theme: "long",
    length: 4.15,
    width: 1,
    rail: 0.4,
    lipY: 3.15,
    holes: [
      cup(0, 3.92, 0.07, 100, { special: "plinko", label: "100" }),
      cup(-0.18, 3.62, 0.078, 50),
      cup(0.18, 3.62, 0.078, 50),
      cup(0, 3.34, 0.08, 40),
      cup(-0.22, 2.55, 0.09, 30),
      cup(0.22, 1.85, 0.09, 20),
      cup(0, 1.15, 0.095, 10, { captureEasy: true }),
    ],
    bumpers: [{ x: 0, y: 2.15, r: 0.06, impulse: 1.35 }],
    pegs: [],
    hills: [
      { x: 0, y: 0.85, r: 0.42, h: 0.18 },
      { x: -0.12, y: 1.55, r: 0.34, h: 0.22 },
      { x: 0.16, y: 2.35, r: 0.36, h: 0.2 },
      { x: -0.08, y: 2.95, r: 0.3, h: 0.16 },
    ],
    spinners: [],
    crates: [],
    steer: 1.35,
  },
  {
    id: "mutiny",
    name: "Midnight Mutiny",
    blurb: "The carny is cheating. So can you.",
    theme: "chaos",
    length: 2.72,
    width: 1,
    rail: 0.4,
    lipY: 1.1,
    holes: [
      cup(0.12, 2.5, 0.068, 100, { special: "plinko", label: "100" }),
      cup(-0.2, 2.28, 0.072, 50, { special: "pinball", label: "PIN" }),
      cup(0.22, 2.08, 0.07, 50),
      cup(0, 1.86, 0.078, 40),
      cup(-0.22, 1.62, 0.08, 20),
      cup(0.2, 1.42, 0.085, 10, { captureEasy: true, special: "mult" }),
    ],
    bumpers: [
      { x: -0.14, y: 0.88, r: 0.062, impulse: 1.6 },
      { x: 0.18, y: 1.05, r: 0.06, impulse: 1.5 },
    ],
    pegs: [
      { x: 0, y: 0.62, r: 0.03 },
      { x: -0.2, y: 1.18, r: 0.026 },
      { x: 0.12, y: 1.28, r: 0.026 },
    ],
    hills: [{ x: 0.06, y: 0.7, r: 0.28, h: 0.14 }],
    spinners: [{ x: -0.02, y: 1.72, len: 0.14, omega: -2.1, angle: 0.4, blades: 3 }],
    crates: [],
    steer: 0.85,
    oil: { x: 0.08, y: 0.48, r: 0.16 },
  },
];

LANES[0]!.holes = skeeHolesFor(LANES[0]!);

export const VERSUS_LANE_INDEX = [0, 2, 4];

export function cloneLane(def: LaneDef): LaneDef {
  return {
    ...def,
    holes: def.holes.map((h) => ({ ...h })),
    bumpers: def.bumpers.map((b) => ({ ...b })),
    pegs: def.pegs.map((p) => ({ ...p })),
    hills: def.hills.map((h) => ({ ...h })),
    spinners: def.spinners.map((s) => ({ ...s })),
    crates: def.crates.map((c) => ({ ...c })),
    oil: def.oil ? { ...def.oil } : undefined,
  };
}
