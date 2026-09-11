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
  extras?: {
    emissive?: string;
    emissiveIntensity?: number;
    transparent?: boolean;
    opacity?: number;
    side?: THREE.Side;
    snap?: boolean;
  },
) {
  const key = `${color}|${extras?.emissive ?? ""}|${extras?.emissiveIntensity ?? 0}|${extras?.opacity ?? 1}|${extras?.side ?? 0}|${extras?.snap ? 1 : 0}`;
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
  if (extras?.snap) snapify(m);
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
  if (extras?.snap) snapify(m);
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
    t.wall.repeat.set(7, 2.6);
    t.floor.wrapS = t.floor.wrapT = THREE.RepeatWrapping;
    t.floor.repeat.set(12, 14);
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

/** Tiny arcade stub: name only. Full rules live on the hover card. */
export function paintStub(name: string, type: string, selected = false) {
  const key = `stub2|${name}|${type}|${selected}`;
  const hit = signCache.get(key);
  if (hit) return hit;
  const w = 360;
  const h = 120;
  const c = document.createElement("canvas");
  c.width = w;
  c.height = h;
  const g = c.getContext("2d")!;
  const pal = TYPE_FACE[type] ?? TYPE_FACE.ball!;
  g.fillStyle = selected ? "#fff3d6" : pal.bg;
  g.fillRect(0, 0, w, h);
  g.fillStyle = pal.band;
  g.fillRect(0, 0, 28, h);
  g.fillStyle = pal.bg;
  for (let y = 10; y < h; y += 14) {
    g.beginPath();
    g.arc(14, y, 5, 0, Math.PI * 2);
    g.fill();
  }
  g.fillStyle = pal.band;
  g.fillRect(28, 0, w - 28, 18);
  g.fillStyle = "#f4e6c4";
  g.font = "700 11px Georgia, serif";
  g.textAlign = "left";
  g.textBaseline = "middle";
  g.fillText("WILD ALLEY", 38, 9);
  g.textAlign = "right";
  g.fillText(type.toUpperCase(), w - 10, 9);

  g.fillStyle = pal.ink;
  g.textAlign = "left";
  g.font = "700 28px Georgia, serif";
  g.fillText(name.toUpperCase().slice(0, 16), 40, 58);

  g.strokeStyle = pal.band;
  g.setLineDash([4, 5]);
  g.lineWidth = 2;
  g.beginPath();
  g.moveTo(36, h - 22);
  g.lineTo(w - 16, h - 22);
  g.stroke();
  g.setLineDash([]);
  g.fillStyle = "#8a6a48";
  g.font = "700 11px ui-monospace, monospace";
  g.fillText(`№ ${String(name.length * 17 + 4200).slice(-4)}`, 40, h - 10);

  if (selected) {
    g.strokeStyle = "#c47a3a";
    g.lineWidth = 6;
    g.strokeRect(3, 3, w - 6, h - 6);
  }

  const tex = new THREE.CanvasTexture(c);
  tex.magFilter = THREE.LinearFilter;
  tex.minFilter = THREE.LinearFilter;
  tex.colorSpace = THREE.SRGBColorSpace;
  signCache.set(key, tex);
  return tex;
}

const TYPE_FACE: Record<string, { bg: string; ink: string; band: string }> = {
  ball: { bg: "#f3e6c8", ink: "#3a2418", band: "#c45c48" },
  lane: { bg: "#efe0b8", ink: "#3a1810", band: "#c47a3a" },
  score: { bg: "#f0dca8", ink: "#3a280c", band: "#d4a04a" },
  sabotage: { bg: "#e8d0c0", ink: "#4a1010", band: "#8a2820" },
};

/** Perforated paper stub that sits in a bifold slot. */
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

  g.fillStyle = pal.band;
  g.fillRect(28, 98, 64, 50);
  g.fillStyle = pal.bg;
  g.font = "700 11px ui-monospace, monospace";
  g.textAlign = "center";
  g.textBaseline = "middle";
  g.fillText("STUB", 60, 123);
  g.textBaseline = "alphabetic";
  g.strokeStyle = pal.ink;
  g.globalAlpha = 0.35;
  g.setLineDash([5, 6]);
  g.lineWidth = 2;
  g.beginPath();
  g.moveTo(16, 168);
  g.lineTo(w - 16, 168);
  g.stroke();
  g.setLineDash([]);
  g.globalAlpha = 1;

  g.fillStyle = pal.ink;
  g.textAlign = "left";
  g.font = "700 36px Georgia, serif";
  g.fillText(name.toUpperCase().slice(0, 18), 22, 232);

  g.fillStyle = pal.ink;
  g.globalAlpha = 0.78;
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
  g.globalAlpha = 1;

  g.fillStyle = pal.band;
  g.globalAlpha = 0.85;
  g.fillRect(w - 86, 92, 62, 48);
  g.globalAlpha = 1;
  g.fillStyle = pal.bg;
  g.font = "700 13px Georgia, serif";
  g.textAlign = "center";
  g.fillText("WA", w - 55, 116);
  g.font = "700 11px ui-monospace, monospace";
  g.fillStyle = "#8a6a48";
  g.textAlign = "right";
  g.fillText(`№ ${String(name.length * 17 + 4200).slice(-4)}`, w - 22, h - 22);

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

export function paintCupLabel(text: string) {
  const key = `cup|${text}`;
  const hit = signCache.get(key);
  if (hit) return hit;
  const w = 256;
  const h = 192;
  const c = document.createElement("canvas");
  c.width = w;
  c.height = h;
  const g = c.getContext("2d")!;
  g.fillStyle = "#f4ead4";
  g.fillRect(0, 0, w, h);
  g.fillStyle = "#6a1810";
  g.font = `700 ${Math.floor(h * 0.58)}px Georgia, serif`;
  g.textAlign = "center";
  g.textBaseline = "middle";
  g.fillText(text, w / 2, h / 2 + 4);
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
  const key = "skeeface-v5";
  const hit = signCache.get(key);
  if (hit) return hit;
  const s = 1024;
  const c = document.createElement("canvas");
  c.width = s;
  c.height = s;
  const g = c.getContext("2d")!;
  const cx = s / 2;
  const cy = s / 2;
  const R = s / 2 - 10;

  g.fillStyle = "#e8c894";
  g.beginPath();
  g.arc(cx, cy, R, 0, Math.PI * 2);
  g.fill();

  g.strokeStyle = "rgba(90,50,24,0.14)";
  g.lineWidth = 3;
  for (let i = 0; i < 14; i++) {
    g.beginPath();
    g.ellipse(cx, cy, R * (0.2 + i * 0.055), R * 0.94, 0, 0, Math.PI * 2);
    g.stroke();
  }

  g.strokeStyle = "#efe6d4";
  g.lineWidth = 28;
  g.beginPath();
  g.arc(cx, cy, R, 0, Math.PI * 2);
  g.stroke();
  g.strokeStyle = "#8a2418";
  g.lineWidth = 8;
  g.beginPath();
  g.arc(cx, cy, R - 18, 0, Math.PI * 2);
  g.stroke();

  const rings = [0.96, 0.72, 0.5, 0.3];
  g.strokeStyle = "#f4ead4";
  g.lineWidth = 14;
  for (const k of rings) {
    g.beginPath();
    g.arc(cx, cy, R * k, 0, Math.PI * 2);
    g.stroke();
  }
  g.strokeStyle = "#6a2418";
  g.lineWidth = 4;
  for (const k of rings) {
    g.beginPath();
    g.arc(cx, cy, R * k - 9, 0, Math.PI * 2);
    g.stroke();
  }

  const FACE_CY = 0.54;
  const FACE_R = 0.56;
  const toC = (lx: number, ly: number) => ({
    x: cx + (lx / FACE_R) * R,
    y: cy - ((ly - FACE_CY) / FACE_R) * R,
  });

  const stack: Array<{ v: number; lx: number; ly: number; rr: number }> = [
    { v: 50, lx: 0, ly: 0.54, rr: 0.05 },
    { v: 40, lx: 0, ly: 0.4, rr: 0.054 },
    { v: 30, lx: 0, ly: 0.29, rr: 0.058 },
    { v: 20, lx: 0, ly: 0.19, rr: 0.064 },
    { v: 10, lx: 0, ly: 0.09, rr: 0.082 },
  ];

  g.textAlign = "center";
  g.textBaseline = "middle";
  for (const h of stack) {
    const p = toC(h.lx, h.ly);
    const rad = (h.rr / FACE_R) * R;
    g.fillStyle = "#c4a078";
    g.beginPath();
    g.arc(p.x, p.y, rad, 0, Math.PI * 2);
    g.fill();
    g.fillStyle = "#efe6d4";
    g.beginPath();
    g.arc(p.x, p.y, rad * 0.55, 0, Math.PI * 2);
    g.fill();
    g.strokeStyle = "#fff6e4";
    g.lineWidth = 10;
    g.beginPath();
    g.arc(p.x, p.y, rad + 2, 0, Math.PI * 2);
    g.stroke();
    g.strokeStyle = "#8a2418";
    g.lineWidth = 4;
    g.beginPath();
    g.arc(p.x, p.y, rad + 9, 0, Math.PI * 2);
    g.stroke();

    const tx = p.x + rad + 52;
    const ty = p.y;
    const fs = h.v === 10 ? 92 : 80;
    g.font = `700 ${fs}px Georgia, serif`;
    g.lineWidth = 12;
    g.strokeStyle = "#fff6e4";
    g.strokeText(String(h.v), tx, ty);
    g.fillStyle = "#6a1810";
    g.fillText(String(h.v), tx, ty);
  }

  const tex = new THREE.CanvasTexture(c);
  tex.magFilter = THREE.LinearFilter;
  tex.minFilter = THREE.LinearFilter;
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
