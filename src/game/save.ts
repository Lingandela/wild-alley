const KEY = "wild-alley-v1";
const VERSION = 1;

export type SaveData = {
  version: number;
  highScore: number;
  muted: boolean;
};

const DEFAULTS: SaveData = { version: VERSION, highScore: 0, muted: false };

export function loadSave(): SaveData {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return { ...DEFAULTS };
    const parsed = JSON.parse(raw) as Partial<SaveData>;
    return { ...DEFAULTS, ...parsed, version: VERSION };
  } catch {
    return { ...DEFAULTS };
  }
}

export function writeSave(data: SaveData) {
  try {
    localStorage.setItem(KEY, JSON.stringify({ ...data, version: VERSION }));
  } catch {
    /* private mode / quota */
  }
}
