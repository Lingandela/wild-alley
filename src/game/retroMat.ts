import { useLayoutEffect } from "react";
import { useTexture } from "@react-three/drei";
import * as THREE from "three";

const cache = new Map<string, THREE.MeshLambertMaterial>();

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
  return m;
}

export function retroSign(color: string, extras?: { emissive?: string; emissiveIntensity?: number; map?: THREE.Texture }) {
  return new THREE.MeshLambertMaterial({
    color,
    flatShading: true,
    map: extras?.map,
    emissive: extras?.emissive ?? "#000000",
    emissiveMap: extras?.map,
    emissiveIntensity: extras?.emissiveIntensity ?? 0,
  });
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
