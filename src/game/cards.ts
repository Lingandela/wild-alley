import type { CardDef } from "./types";

export const BALL_CARDS: CardDef[] = [
  {
    id: "heavy",
    name: "Heavy",
    type: "ball",
    text: "Softer bounce, easier cups. +18 chips.",
    effect: "heavy",
  },
  {
    id: "superball",
    name: "Superball",
    type: "ball",
    text: "First cup ricochets and still pays.",
    effect: "superball",
  },
  {
    id: "magnet",
    name: "Magnet",
    type: "ball",
    text: "Gentle pull toward the nearest cup.",
    effect: "magnet",
  },
  {
    id: "grease",
    name: "Grease",
    type: "ball",
    text: "Low friction. Long, dangerous rolls.",
    effect: "grease",
  },
  {
    id: "splitter",
    name: "Splitter",
    type: "ball",
    text: "Two balls. Both score.",
    effect: "split",
  },
  {
    id: "anchor",
    name: "Anchor",
    type: "ball",
    text: "Sticks to the floor. Hills won't launch you.",
    effect: "anchor",
  },
  {
    id: "lucky",
    name: "Lucky Bounce",
    type: "ball",
    text: "Whatever you hit, +40 chips.",
    effect: "lucky",
  },
];

export const LANE_CARDS: CardDef[] = [
  {
    id: "wide",
    name: "Wide Cups",
    type: "lane",
    text: "Every hole grows by a fifth.",
    effect: "wide",
  },
  {
    id: "bumpers",
    name: "Bumper Party",
    type: "lane",
    text: "Three live bumpers. Each ding pays.",
    effect: "bumpers",
  },
  {
    id: "raise50",
    name: "Raise the 50s",
    type: "lane",
    text: "Fifty-point cups stamp as 80.",
    effect: "raise50",
  },
  {
    id: "tailwind",
    name: "Tail Wind",
    type: "lane",
    text: "A constant shove up the alley.",
    effect: "tailwind",
  },
  {
    id: "swap",
    name: "Swap Meet",
    type: "lane",
    text: "Tens and hundreds trade places.",
    effect: "swap",
  },
  {
    id: "rails",
    name: "Tight Rails",
    type: "lane",
    text: "Narrower alley. More english, less room.",
    effect: "rails",
  },
];

export const SCORE_CARDS: CardDef[] = [
  {
    id: "tip",
    name: "The Tip",
    type: "score",
    text: "+1 Mult on this throw.",
    effect: "tip",
  },
  {
    id: "double",
    name: "Double Up",
    type: "score",
    text: "Multiply Mult by 2.",
    effect: "double",
  },
  {
    id: "nest",
    name: "Nest Egg",
    type: "score",
    text: "Add 15% of your run total as chips.",
    effect: "nest",
  },
  {
    id: "streak",
    name: "Streak",
    type: "score",
    text: "+2 Mult if your last cup was 50+.",
    effect: "streak",
  },
  {
    id: "tax",
    name: "Ten-Cup Tax",
    type: "score",
    text: "Landing a 10 adds +3 Mult.",
    effect: "tax",
  },
];

export const SABOTAGE_CARDS: CardDef[] = [
  {
    id: "trap",
    name: "Trap Door",
    type: "sabotage",
    text: "The 100 is now a gutter.",
    effect: "trap",
  },
  {
    id: "breeze",
    name: "Crossbreeze",
    type: "sabotage",
    text: "A nasty side wind while it rolls.",
    effect: "crossbreeze",
  },
  {
    id: "crate",
    name: "Crate Drop",
    type: "sabotage",
    text: "Drop a crate in front of the 50s.",
    effect: "crate",
  },
  {
    id: "flip",
    name: "Value Flip",
    type: "sabotage",
    text: "High cups go cheap. Tens go rich.",
    effect: "flip",
  },
  {
    id: "well",
    name: "Gravity Well",
    type: "sabotage",
    text: "The gutters start to drink.",
    effect: "gravityWell",
  },
  {
    id: "shrink",
    name: "Shrink 100",
    type: "sabotage",
    text: "The jackpot cup pinches shut.",
    effect: "shrink",
  },
];

export const STARTER_IDS = [
  "heavy",
  "superball",
  "magnet",
  "grease",
  "splitter",
  "wide",
  "bumpers",
  "raise50",
  "tailwind",
  "tip",
  "double",
  "lucky",
  "nest",
];

export const PRIZE_IDS = ["swap", "streak", "tax", "anchor", "rails"];

const ALL = [...BALL_CARDS, ...LANE_CARDS, ...SCORE_CARDS, ...SABOTAGE_CARDS];
const BY_ID = new Map(ALL.map((c) => [c.id, c]));

export function cardById(id: string): CardDef {
  const c = BY_ID.get(id);
  if (!c) throw new Error(`Unknown card ${id}`);
  return c;
}

export function starterDeck(): CardDef[] {
  return STARTER_IDS.map(cardById);
}

export function prizePool(owned: Set<string>): CardDef[] {
  return PRIZE_IDS.map(cardById).filter((c) => !owned.has(c.id));
}

export function sabotageDeck(): CardDef[] {
  return SABOTAGE_CARDS.map((c) => ({ ...c }));
}

export function shuffle<T>(arr: T[], rng: () => number): T[] {
  const a = arr.slice();
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    const t = a[i]!;
    a[i] = a[j]!;
    a[j] = t;
  }
  return a;
}

let uidSeq = 1;
export function mint(def: CardDef): CardDef & { uid: string } {
  uidSeq += 1;
  return { ...def, uid: `${def.id}-${uidSeq}` };
}
