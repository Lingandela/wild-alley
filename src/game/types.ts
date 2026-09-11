export type CardType = "ball" | "lane" | "score" | "sabotage";

export type CardDef = {
  id: string;
  name: string;
  type: CardType;
  text: string;
  effect: string;
};

export type Hole = {
  x: number;
  y: number;
  r: number;
  value: number;
  special?: "plinko" | "pinball" | "mult";
  label?: string;
  captureEasy?: boolean;
  /** Board-local position on a classic skee face. When set, 3D uses these, not the 2D map. */
  faceX?: number;
  faceY?: number;
  faceR?: number;
};

export type Bumper = {
  x: number;
  y: number;
  r: number;
  impulse: number;
};

export type Peg = { x: number; y: number; r: number };

export type Hill = { x: number; y: number; r: number; h: number };

export type Seg = { ax: number; ay: number; bx: number; by: number };

export type Spinner = {
  x: number;
  y: number;
  len: number;
  omega: number;
  angle: number;
  blades: number;
};

export type Crate = { x: number; y: number; w: number; h: number };

export type LaneTheme = "classic" | "golf" | "pinball" | "long" | "chaos";

export type LaneDef = {
  id: string;
  name: string;
  blurb: string;
  theme: LaneTheme;
  length: number;
  width: number;
  rail: number;
  lipY: number;
  holes: Hole[];
  bumpers: Bumper[];
  pegs: Peg[];
  hills: Hill[];
  spinners: Spinner[];
  crates: Crate[];
  steer: number;
  oil?: { x: number; y: number; r: number };
};

export type Ball = {
  x: number;
  y: number;
  z: number;
  vx: number;
  vy: number;
  vz: number;
  r: number;
  spin: number;
  alive: boolean;
  scored: boolean;
  rest: number;
  superSkip: boolean;
};

export type Phase =
  | "demo"
  | "intro"
  | "pick"
  | "aim"
  | "roll"
  | "bonus"
  | "tally"
  | "prize"
  | "handoff"
  | "results";

export type Mode = "demo" | "carnival" | "versus";

export type TallyLine = { label: string; value: string; kind: "plain" | "chips" | "mult" | "total" };

export type UiCard = CardDef & { uid: string };

export type Snapshot = {
  screen: "menu" | "how" | "play" | "results";
  mode: Mode;
  phase: Phase;
  paused: boolean;
  laneName: string;
  laneBlurb: string;
  laneIndex: number;
  laneCount: number;
  theme: LaneTheme;
  player: number;
  names: [string, string];
  scores: [number, number];
  ballsLeft: number;
  ballsEach: number;
  chips: number;
  mult: number;
  tally: TallyLine[];
  tallyTotal: number;
  hand: UiCard[];
  selected: string[];
  sabotageHand: UiCard[];
  canSabotage: boolean;
  sabotageUsed: boolean;
  prizes: UiCard[];
  power: number;
  message: string;
  flash: string;
  highScore: number;
  muted: boolean;
  lastHole: string;
  introName: string;
  canReady: boolean;
  walletOpen: boolean;
  hover: UiCard | null;
  isVersus: boolean;
  winner: number;
  pointerLocked: boolean;
  seated: boolean;
};

export type ThrowFlags = {
  magnet: boolean;
  heavy: boolean;
  superball: boolean;
  split: boolean;
  grease: boolean;
  anchor: boolean;
  tailwind: boolean;
  lucky: boolean;
  nest: boolean;
  streak: boolean;
  tax: boolean;
  crossbreeze: boolean;
  gravityWell: boolean;
  restitution: number;
  friction: number;
  launchScale: number;
  holeScale: number;
  chipsAdd: number;
  multAdd: number;
  multMul: number;
};

export const BALL_R = 0.036;
export const MAX_SPEED = 6.2;
export const BALLS_CARNIVAL = 3;
export const BALLS_VERSUS = 3;
export const LANES_CARNIVAL = 5;
export const HAND_SIZE = 5;
export const MAX_PLAY = 2;
