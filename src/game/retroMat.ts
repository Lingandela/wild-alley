import { useLayoutEffect } from "react";
import { useTexture } from "@react-three/drei";
import * as THREE from "three";

const cache = new Map<string, THREE.MeshLambertMaterial>();

/** Shared materials must outlive any one mesh — R3F dispose() on unmount would black the parlor. */
function immortal<T extends THREE.Material>(m: T): T {
  m.userData.immortal = true;
  m.dispose = () => {};
  return m;
}

function snapify(mat: THREE.MeshLambertMaterial, grid = 112) {
  mat.onBeforeCompile = (shader) => {
    shader.vertexShader = shader.vertexShader.replace(
      "#include <project_vertex>",
      `#include <project_vertex>
      gl_Position.xy = floor(gl_Position.xy / gl_Position.w * ${grid}.0 + 0.5) / ${grid}.0 * gl_Position.w;`,
    );
  };
  mat.customProgramCacheKey = () => `ps1-snap-${grid}`;
  return mat;
}

export function retro(
  color: string,
  extras?: { emissive?: string; emissiveIntensity?: number; transparent?: boolean; opacity?: number; side?: THREE.Side },
) {
  const key = `${color}|${extras?.emissive ?? ""}|${extras?.emissiveIntensity ?? 0}|${extras?.opacity ?? 1}|${extras?.side ?? 0}`;
  const hit = cache.get(key);
  if (hit) return hit;
  const m = new THREE.MeshLambertMaterial({
    color,
    flatShading: true,
    emissive: extras?.emissive ?? "#000000",
    emissiveIntensity: extras?.emissiveIntensity ?? 0,
    transparent: extras?.transparent ?? false,
    opacity: extras?.opacity ?? 1,
    side: extras?.side ?? THREE.FrontSide,
  });
  snapify(m);
  immortal(m);
  cache.set(key, m);
  return m;
}

export function retroMapped(
  map: THREE.Texture,
  tint = "#ffffff",
  extras?: { emissive?: string; emissiveIntensity?: number; snap?: boolean },
) {
  const m = new THREE.MeshLambertMaterial({
    color: tint,
    map,
    flatShading: true,
    emissive: extras?.emissive ?? "#000000",
    emissiveIntensity: extras?.emissiveIntensity ?? 0,
  });
  if (extras?.snap !== false) snapify(m);
  return immortal(m);
}

export function retroSign(color: string, extras?: { emissive?: string; emissiveIntensity?: number; map?: THREE.Texture }) {
  return immortal(
    new THREE.MeshLambertMaterial({
      color,
      flatShading: true,
      map: extras?.map,
      emissive: extras?.emissive ?? "#000000",
      emissiveMap: extras?.map,
      emissiveIntensity: extras?.emissiveIntensity ?? 0,
    }),
  );
}

export function crunch(tex: THREE.Texture, max = 160) {
  const img = tex.image as { width?: number; height?: number } | undefined;
  if (img && typeof img.width === "number" && img.width > max) {
    const c = document.createElement("canvas");
    const aspect = (img.height ?? max) / img.width;
    c.width = max;
    c.height = Math.max(1, Math.round(max * aspect));
    const g = c.getContext("2d")!;
    g.imageSmoothingEnabled = false;
    g.drawImage(img as CanvasImageSource, 0, 0, c.width, c.height);
    tex.image = c;
  }
  tex.magFilter = THREE.NearestFilter;
  tex.minFilter = THREE.NearestFilter;
  tex.generateMipmaps = false;
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.needsUpdate = true;
  return tex;
}

export type ArcadeTextures = {
  wood: THREE.Texture;
  wall: THREE.Texture;
  floor: THREE.Texture;
  poster: THREE.Texture;
  window: THREE.Texture;
  prizes: THREE.Texture;
  prizes2: THREE.Texture;
  prizes3: THREE.Texture;
  candy: THREE.Texture;
  food: THREE.Texture;
  mural: THREE.Texture;
  banner: THREE.Texture;
  tickets: THREE.Texture;
  claw: THREE.Texture;
  hanging: THREE.Texture;
  cabinet: THREE.Texture;
  leather: THREE.Texture;
  suede: THREE.Texture;
};

export function useArcadeTextures(): ArcadeTextures {
  const t = useTexture({
    wood: "/tex/wood.jpg",
    wall: "/tex/wall.jpg",
    floor: "/tex/floor.jpg",
    poster: "/tex/poster.jpg",
    window: "/tex/window.jpg",
    prizes: "/tex/prizes.jpg",
    prizes2: "/tex/prizes2.jpg",
    prizes3: "/tex/prizes3.jpg",
    candy: "/tex/candy.jpg",
    food: "/tex/food.jpg",
    mural: "/tex/mural.jpg",
    banner: "/tex/banner.jpg",
    tickets: "/tex/tickets.jpg",
    claw: "/tex/claw.jpg",
    hanging: "/tex/hanging.jpg",
    cabinet: "/tex/cabinet.jpg",
    leather: "/tex/leather.jpg",
    suede: "/tex/suede.jpg",
  });
  useLayoutEffect(() => {
    crunch(t.wood, 128);
    crunch(t.wall, 128);
    crunch(t.floor, 128);
    crunch(t.poster, 256);
    crunch(t.window, 256);
    crunch(t.prizes, 320);
    crunch(t.prizes2, 320);
    crunch(t.prizes3, 320);
    crunch(t.candy, 256);
    crunch(t.food, 320);
    crunch(t.mural, 256);
    crunch(t.banner, 320);
    crunch(t.tickets, 256);
    crunch(t.claw, 256);
    crunch(t.hanging, 320);
    crunch(t.cabinet, 192);
    crunch(t.leather, 256);
    crunch(t.suede, 256);
    t.wood.wrapS = t.wood.wrapT = THREE.RepeatWrapping;
    t.wood.repeat.set(1.6, 7);
    t.wall.wrapS = t.wall.wrapT = THREE.RepeatWrapping;
    t.wall.repeat.set(5, 2.2);
    t.floor.wrapS = t.floor.wrapT = THREE.RepeatWrapping;
    t.floor.repeat.set(9, 11);
  }, [t]);
  return t;
}

const signCache = new Map<string, THREE.CanvasTexture>();

export function paintSign(title: string, w = 512, h = 128, fill = "#efe6d4", glow = "#c47a3a") {
  const key = `${title}|${w}|${h}|${fill}`;
  const hit = signCache.get(key);
  if (hit) return hit;
  const c = document.createElement("canvas");
  c.width = w;
  c.height = h;
  const g = c.getContext("2d")!;
  g.fillStyle = "#140c10";
  g.fillRect(0, 0, w, h);
  g.strokeStyle = glow;
  g.lineWidth = 8;
  g.strokeRect(10, 10, w - 20, h - 20);
  g.fillStyle = fill;
  g.font = `700 ${Math.floor(h * 0.42)}px Georgia, serif`;
  g.textAlign = "center";
  g.textBaseline = "middle";
  g.fillText(title, w / 2, h / 2 + 2);
  const tex = new THREE.CanvasTexture(c);
  tex.magFilter = THREE.NearestFilter;
  tex.minFilter = THREE.NearestFilter;
  tex.colorSpace = THREE.SRGBColorSpace;
  signCache.set(key, tex);
  return tex;
}

export function paintTicket(name: string, type: string, text: string, selected = false) {
  return paintTearTicket(name, type, text, selected);
}

/** Carnival redemption stub: scalloped sides, name, serial. */
export function paintTearTicket(name: string, type: string, text: string, selected = false) {
  const key = `tear|${name}|${type}|${text}|${selected}`;
  const hit = signCache.get(key);
  if (hit) return hit;
  const w = 220;
  const h = 420;
  const c = document.createElement("canvas");
  c.width = w;
  c.height = h;
  const g = c.getContext("2d")!;
  g.fillStyle = selected ? "#fff3d6" : "#f4e6c4";
  g.fillRect(0, 0, w, h);
  g.fillStyle = type === "sabotage" ? "#c45c48" : type === "score" ? "#c47a3a" : "#3a2418";
  g.fillRect(0, 0, w, 38);
  g.fillStyle = "#f4e6c4";
  g.font = "700 13px Georgia, serif";
  g.textAlign = "center";
  g.textBaseline = "middle";
  g.fillText("WILD ALLEY", w / 2, 19);

  g.fillStyle = type === "sabotage" ? "#c45c48" : "#7a1c1c";
  g.fillRect(0, 38, 14, h - 38);
  g.fillRect(w - 14, 38, 14, h - 38);
  g.fillStyle = selected ? "#fff3d6" : "#f4e6c4";
  for (let y = 48; y < h - 8; y += 16) {
    g.beginPath();
    g.arc(7, y, 5, 0, Math.PI * 2);
    g.fill();
    g.beginPath();
    g.arc(w - 7, y, 5, 0, Math.PI * 2);
    g.fill();
  }

  g.strokeStyle = "#c47a3a";
  g.setLineDash([4, 6]);
  g.lineWidth = 2;
  g.beginPath();
  g.moveTo(22, 52);
  g.lineTo(w - 22, 52);
  g.stroke();
  g.setLineDash([]);

  g.fillStyle = "#2a1810";
  g.font = "700 11px Georgia, serif";
  g.fillText(type.toUpperCase(), w / 2, 70);

  g.font = "700 28px Georgia, serif";
  const words = name.split(" ");
  let ny = 118;
  for (const word of words) {
    g.fillText(word, w / 2, ny);
    ny += 32;
  }

  g.fillStyle = "#6a4a38";
  g.font = "15px Georgia, serif";
  const bits = text.split(" ");
  let line = "";
  let ty = ny + 16;
  for (const bit of bits) {
    const next = line ? `${line} ${bit}` : bit;
    if (g.measureText(next).width > 160) {
      g.fillText(line, w / 2, ty);
      line = bit;
      ty += 18;
    } else line = next;
  }
  if (line) g.fillText(line, w / 2, ty);

  g.strokeStyle = "#c47a3a";
  g.setLineDash([3, 5]);
  g.beginPath();
  g.moveTo(24, h - 58);
  g.lineTo(w - 24, h - 58);
  g.stroke();
  g.setLineDash([]);
  g.fillStyle = "#8a6a48";
  g.font = "700 12px ui-monospace, monospace";
  const serial = `№ ${name.length * 17 + type.length * 41}`.slice(0, 10);
  g.fillText(serial, w / 2, h - 34);
  g.font = "10px Georgia, serif";
  g.fillText("TEAR ALONG DOTS", w / 2, h - 16);

  if (selected) {
    g.strokeStyle = "#c47a3a";
    g.lineWidth = 6;
    g.strokeRect(4, 4, w - 8, h - 8);
  }

  const tex = new THREE.CanvasTexture(c);
  tex.magFilter = THREE.NearestFilter;
  tex.minFilter = THREE.NearestFilter;
  tex.colorSpace = THREE.SRGBColorSpace;
  signCache.set(key, tex);
  return tex;
}

const TYPE_FACE: Record<string, { bg: string; ink: string; band: string }> = {
  ball: { bg: "#3d2a1c", ink: "#efe6d4", band: "#c47a3a" },
  lane: { bg: "#5a1c1c", ink: "#efe6d4", band: "#c45c48" },
  score: { bg: "#4a3010", ink: "#ffe6b0", band: "#d4a04a" },
  sabotage: { bg: "#1c1014", ink: "#f0c8c0", band: "#c45c48" },
};

/** Landscape plastic card that sits in a bifold slot (ISO ID-1 ratio). */
export function paintWalletCard(name: string, type: string, text: string, selected = false) {
  const key = `wcard|${name}|${type}|${text}|${selected}`;
  const hit = signCache.get(key);
  if (hit) return hit;
  const w = 512;
  const h = 324;
  const c = document.createElement("canvas");
  c.width = w;
  c.height = h;
  const g = c.getContext("2d")!;
  const pal = TYPE_FACE[type] ?? TYPE_FACE.ball!;
  g.fillStyle = pal.bg;
  g.fillRect(0, 0, w, h);
  const grd = g.createLinearGradient(0, 0, w, h);
  grd.addColorStop(0, "rgba(255,230,180,0.14)");
  grd.addColorStop(0.45, "rgba(0,0,0,0)");
  grd.addColorStop(1, "rgba(0,0,0,0.28)");
  g.fillStyle = grd;
  g.fillRect(0, 0, w, h);

  g.fillStyle = pal.band;
  g.fillRect(0, 0, w, 72);
  g.fillStyle = pal.ink;
  g.font = "700 15px Georgia, serif";
  g.textAlign = "left";
  g.textBaseline = "middle";
  g.fillText("WILD ALLEY", 22, 24);
  g.font = "700 11px ui-monospace, monospace";
  g.fillText(type.toUpperCase(), 22, 50);
  g.textAlign = "right";
  g.font = "700 13px Georgia, serif";
  g.fillText(selected ? "ACTIVE" : "TEAR TO PLAY", w - 22, 36);

  g.fillStyle = "#d4b060";
  g.fillRect(28, 98, 64, 50);
  g.fillStyle = "#8a6a28";
  g.fillRect(34, 104, 52, 16);
  g.fillRect(34, 126, 28, 16);
  g.fillStyle = "#1a1010";
  g.fillRect(0, 168, w, 28);

  g.fillStyle = pal.ink;
  g.textAlign = "left";
  g.font = "700 36px Georgia, serif";
  g.fillText(name.toUpperCase().slice(0, 18), 22, 232);

  g.fillStyle = "rgba(239,230,212,0.75)";
  g.font = "14px Georgia, serif";
  const bits = text.split(" ");
  let line = "";
  let ty = 268;
  let lines = 0;
  for (const bit of bits) {
    const next = line ? `${line} ${bit}` : bit;
    if (g.measureText(next).width > 360) {
      g.fillText(line, 22, ty);
      line = bit;
      ty += 18;
      lines += 1;
      if (lines >= 2) break;
    } else line = next;
  }
  if (line && lines < 2) g.fillText(line, 22, ty);

  g.fillStyle = "#d4b060";
  g.fillRect(w - 78, 92, 52, 52);
  g.strokeStyle = "#efe6d4";
  g.lineWidth = 3;
  g.beginPath();
  g.arc(w - 52, 118, 16, 0, Math.PI * 2);
  g.stroke();
  g.font = "700 11px ui-monospace, monospace";
  g.fillStyle = "#8a6a48";
  g.textAlign = "right";
  g.fillText(`•••• ${String(name.length * 17 + 4200).slice(-4)}`, w - 22, h - 22);

  if (selected) {
    g.strokeStyle = "#c47a3a";
    g.lineWidth = 10;
    g.strokeRect(6, 6, w - 12, h - 12);
  }

  const tex = new THREE.CanvasTexture(c);
  tex.magFilter = THREE.LinearFilter;
  tex.minFilter = THREE.LinearFilter;
  tex.colorSpace = THREE.SRGBColorSpace;
  signCache.set(key, tex);
  return tex;
}

export function paintIdCard(holder: string) {
  const key = `id|${holder}`;
  const hit = signCache.get(key);
  if (hit) return hit;
  const w = 512;
  const h = 324;
  const c = document.createElement("canvas");
  c.width = w;
  c.height = h;
  const g = c.getContext("2d")!;
  g.fillStyle = "#efe6d4";
  g.fillRect(0, 0, w, h);
  g.fillStyle = "#7a1c18";
  g.fillRect(0, 0, w, 58);
  g.fillStyle = "#efe6d4";
  g.font = "700 18px Georgia, serif";
  g.textAlign = "center";
  g.textBaseline = "middle";
  g.fillText("WILD ALLEY  ·  SEASON PASS", w / 2, 30);

  g.fillStyle = "#c45c48";
  g.fillRect(24, 78, 140, 168);
  g.fillStyle = "#2a1810";
  g.fillRect(32, 86, 124, 152);
  g.fillStyle = "#c47a3a";
  g.beginPath();
  g.arc(94, 148, 28, 0, Math.PI * 2);
  g.fill();
  g.fillStyle = "#efe6d4";
  g.fillRect(62, 176, 64, 48);
  g.fillStyle = "#c47a3a";
  g.fillRect(70, 128, 48, 10);

  g.fillStyle = "#2a1810";
  g.textAlign = "left";
  g.font = "700 13px Georgia, serif";
  g.fillText("MEMBER", 184, 96);
  g.font = "700 32px Georgia, serif";
  g.fillText(holder.toUpperCase().slice(0, 14), 184, 138);
  g.font = "14px Georgia, serif";
  g.fillStyle = "#6a4a38";
  g.fillText("Unlimited skee  ·  parlor access", 184, 176);
  g.fillText("Not valid at the claw", 184, 198);
  g.font = "700 12px ui-monospace, monospace";
  g.fillStyle = "#8a6a48";
  g.fillText("NO. 19  08  26", 184, 232);
  g.fillStyle = "#7a1c18";
  g.fillRect(0, h - 28, w, 28);
  g.fillStyle = "#efe6d4";
  g.font = "700 11px Georgia, serif";
  g.textAlign = "center";
  g.fillText("IF FOUND RETURN TO THE TICKET BOOTH", w / 2, h - 14);

  const tex = new THREE.CanvasTexture(c);
  tex.magFilter = THREE.LinearFilter;
  tex.minFilter = THREE.LinearFilter;
  tex.colorSpace = THREE.SRGBColorSpace;
  signCache.set(key, tex);
  return tex;
}

export function paintBill(kind: 1 | 5 | 10) {
  const key = `bill|${kind}`;
  const hit = signCache.get(key);
  if (hit) return hit;
  const w = 512;
  const h = 220;
  const c = document.createElement("canvas");
  c.width = w;
  c.height = h;
  const g = c.getContext("2d")!;
  g.fillStyle = kind === 10 ? "#d8c070" : kind === 5 ? "#8aaf7a" : "#d8c8a0";
  g.fillRect(0, 0, w, h);
  g.strokeStyle = "#2a1810";
  g.lineWidth = 8;
  g.strokeRect(10, 10, w - 20, h - 20);
  g.strokeStyle = "#5a3a20";
  g.lineWidth = 2;
  g.strokeRect(22, 22, w - 44, h - 44);
  g.fillStyle = "#2a1810";
  g.font = "700 64px Georgia, serif";
  g.textAlign = "center";
  g.textBaseline = "middle";
  g.fillText(String(kind), w / 2, h / 2 - 8);
  g.font = "700 16px Georgia, serif";
  g.fillText("ALLEY SCRIP", w / 2, 44);
  g.font = "12px Georgia, serif";
  g.fillText("GOOD FOR TICKETS AND CORN DOGS", w / 2, h - 40);
  g.font = "700 28px Georgia, serif";
  g.textAlign = "left";
  g.fillText(String(kind), 36, h / 2);
  g.textAlign = "right";
  g.fillText(String(kind), w - 36, h / 2);

  const tex = new THREE.CanvasTexture(c);
  tex.magFilter = THREE.LinearFilter;
  tex.minFilter = THREE.LinearFilter;
  tex.colorSpace = THREE.SRGBColorSpace;
  signCache.set(key, tex);
  return tex;
}

export function holeRing(value: number) {
  if (value >= 100) return "#efe6d4";
  if (value >= 80) return "#d7b48a";
  if (value >= 50) return "#c45c48";
  if (value >= 40) return "#6a8aa0";
  if (value >= 30) return "#5a7a58";
  if (value >= 20) return "#c4a048";
  if (value <= 0) return "#3a3030";
  return "#efe6d4";
}

export function paintSkeeFace() {
  const key = "skeeface";
  const hit = signCache.get(key);
  if (hit) return hit;
  const s = 512;
  const c = document.createElement("canvas");
  c.width = s;
  c.height = s;
  const g = c.getContext("2d")!;
  const cx = s / 2;
  const cy = s / 2;
  const r = s / 2 - 6;
  g.fillStyle = "#7a1c18";
  g.beginPath();
  g.arc(cx, cy, r, 0, Math.PI * 2);
  g.fill();
  g.strokeStyle = "#efe6d4";
  g.lineWidth = 14;
  g.stroke();
  g.strokeStyle = "#c47a3a";
  g.lineWidth = 5;
  g.beginPath();
  g.arc(cx, cy, r * 0.93, 0, Math.PI * 2);
  g.stroke();
  g.strokeStyle = "#5a1010";
  g.lineWidth = 3;
  for (const k of [0.78, 0.58, 0.38]) {
    g.beginPath();
    g.arc(cx, cy, r * k, 0, Math.PI * 2);
    g.stroke();
  }
  g.fillStyle = "#4a0c0c";
  g.beginPath();
  g.arc(cx, cy + r * 0.12, r * 0.16, 0, Math.PI * 2);
  g.fill();
  const tex = new THREE.CanvasTexture(c);
  tex.magFilter = THREE.NearestFilter;
  tex.minFilter = THREE.NearestFilter;
  tex.colorSpace = THREE.SRGBColorSpace;
  signCache.set(key, tex);
  return tex;
}

export const PALETTE = {
  cream: "#efe6d4",
  copper: "#c47a3a",
  cherry: "#c45c48",
  wood: "#3a2218",
  ink: "#100c12",
  feltClassic: "#7a4a2c",
  feltGolf: "#355838",
  feltPin: "#2a2440",
  feltLong: "#6b4a28",
  feltChaos: "#2c1818",
};
