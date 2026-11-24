export interface TextureData {
  width: number;
  height: number;
  /** Row-major RGBA colors, always stored as #rrggbbaa */
  pixels: string[];
}

export const TRANSPARENT = "#00000000";

/* ------------------------------------------------------------------ */
/* color helpers                                                       */
/* ------------------------------------------------------------------ */

function hashString(str: string): number {
  let h = 2166136261;
  for (let i = 0; i < str.length; i++) {
    h ^= str.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

function mulberry32(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function parseHex(hex: string): [number, number, number, number] {
  let h = hex.replace("#", "");
  if (h.length === 3 || h.length === 4) {
    h = h
      .split("")
      .map((c) => c + c)
      .join("");
  }
  const r = parseInt(h.slice(0, 2), 16) || 0;
  const g = parseInt(h.slice(2, 4), 16) || 0;
  const b = parseInt(h.slice(4, 6), 16) || 0;
  const a = h.length >= 8 ? parseInt(h.slice(6, 8), 16) : 255;
  return [r, g, b, Number.isNaN(a) ? 255 : a];
}

function toHex(r: number, g: number, b: number, a = 255): string {
  const clamp = (v: number) => Math.max(0, Math.min(255, Math.round(v)));
  return (
    "#" +
    [clamp(r), clamp(g), clamp(b), clamp(a)]
      .map((v) => v.toString(16).padStart(2, "0"))
      .join("")
  );
}

function shade(hex: string, amount: number): string {
  const [r, g, b, a] = parseHex(hex);
  return toHex(r + amount, g + amount, b + amount, a);
}

function mix(a: string, b: string, t: number): string {
  const [ar, ag, ab] = parseHex(a);
  const [br, bg, bb] = parseHex(b);
  return toHex(ar + (br - ar) * t, ag + (bg - ag) * t, ab + (bb - ab) * t);
}

const DYE_HEX: Record<string, string> = {
  white: "#ececec", orange: "#e2872c", magenta: "#c257b3", light_blue: "#66a9e0",
  yellow: "#e7c53e", lime: "#79c44c", pink: "#e3a1bd", gray: "#5d5d61",
  light_gray: "#a9a9ad", cyan: "#4bb9bd", purple: "#9059c4", blue: "#4464bd",
  brown: "#855534", green: "#4e8f3d", red: "#cd4c42", black: "#242326",
};

const KEYWORDS: [string, string][] = [
  ["diamond", "#5ed3d6"], ["emerald", "#45c871"], ["redstone", "#d94b3d"],
  ["lapis", "#3458bd"], ["netherite", "#625966"], ["gold", "#e8c33e"],
  ["iron", "#c5c9cd"], ["copper", "#d08b59"], ["coal", "#3b3b3f"],
  ["obsidian", "#302545"], ["crimson", "#9c4559"], ["warped", "#47a692"],
  ["dark_oak", "#4c3526"], ["oak", "#ab834f"], ["spruce", "#71503a"],
  ["birch", "#e2d5a4"], ["jungle", "#8d6339"], ["acacia", "#a9693d"],
  ["mangrove", "#80503f"], ["cherry", "#d88fa1"], ["bamboo", "#a9c46a"],
  ["leaves", "#4f9339"], ["sapling", "#59a83d"], ["vine", "#4c8f36"],
  ["grass", "#68a64a"], ["dirt", "#8a5b30"], ["podzol", "#5e4229"],
  ["mycelium", "#6f5d76"], ["sand", "#dcd2a7"], ["gravel", "#8a8985"],
  ["water", "#3d79c7"], ["lava", "#e3641f"], ["fire", "#ff9133"],
  ["snow", "#f1f6f8"], ["ice", "#a6dcef"], ["deepslate", "#4d4d56"],
  ["blackstone", "#3d3a43"], ["cobble", "#737373"], ["stone", "#848484"],
  ["andesite", "#92908b"], ["diorite", "#c4c2b9"], ["granite", "#9e7263"],
  ["tuff", "#77736f"], ["basalt", "#494549"], ["brick", "#ab5841"],
  ["quartz", "#e6e3db"], ["clay", "#a6aeb5"], ["terracotta", "#a2634d"],
  ["nether", "#903d3d"], ["end", "#cdc49b"], ["purpur", "#b99bb7"],
  ["sculk", "#418c86"], ["amethyst", "#9c71c6"], ["slime", "#7bc45e"],
  ["honey", "#e0a92f"], ["mushroom", "#bb5750"], ["pumpkin", "#d27c29"],
  ["melon", "#83b145"], ["wheat", "#c9a04d"], ["bread", "#bf8c48"],
  ["bone", "#e5dfc8"], ["leather", "#a97549"], ["string", "#ded8c1"],
  ["feather", "#e8e4d8"], ["paper", "#e9e5d7"], ["book", "#8d5140"],
  ["potion", "#a45fd0"], ["arrow", "#b3a78f"], ["map", "#dacaa3"],
  ["glass", "#bfe4ec"], ["wool", "#d8d8d8"], ["concrete", "#9b9ba0"],
  ["spider", "#5a3e3e"], ["creeper", "#5fa348"], ["zombie", "#5d8a52"],
  ["skeleton", "#c9c9c1"], ["enderman", "#2c2b2f"], ["cow", "#7a5137"],
  ["pig", "#e59b9b"], ["sheep", "#e8e4da"], ["chicken", "#e6dfcf"],
  ["wolf", "#b9b5a9"], ["fox", "#d17d3c"], ["frog", "#6da845"],
  ["villager", "#a88769"], ["steve", "#3f7cbb"], ["alex", "#c98252"],
];

function baseColor(text: string): string {
  const lower = text.toLowerCase();
  for (const [key, color] of KEYWORDS) if (lower.includes(key)) return color;
  for (const key of Object.keys(DYE_HEX)) if (lower.includes(key)) return DYE_HEX[key];
  const hue = hashString(text) % 360;
  return hslToHex(hue, 38, 55);
}

function hslToHex(h: number, s: number, l: number): string {
  s /= 100;
  l /= 100;
  const k = (n: number) => (n + h / 30) % 12;
  const a = s * Math.min(l, 1 - l);
  const f = (n: number) => l - a * Math.max(-1, Math.min(k(n) - 3, Math.min(9 - k(n), 1)));
  return toHex(f(0) * 255, f(8) * 255, f(4) * 255);
}

function hashNoise(x: number, y: number): number {
  const n = Math.sin(x * 127.1 + y * 311.7) * 43758.5453;
  return n - Math.floor(n);
}

/* ------------------------------------------------------------------ */
/* placeholder texture generator                                       */
/* ------------------------------------------------------------------ */

interface GenInput {
  name: string;
  path: string;
  category: string;
  size: number;
}

function blockPixel(
  x: number,
  y: number,
  size: number,
  base: string,
  lower: string,
  rnd: () => number,
): string {
  const n = Math.floor(rnd() * 18) - 9;

  if (/log|stem|hyphae|bamboo_block|pillar/.test(lower)) {
    const band = x % 5 === 0 ? -26 : x % 5 === 1 ? 9 : 0;
    return shade(base, band + n * 0.35);
  }
  if (/planks|slab|stairs|fence|door|trapdoor|sign/.test(lower)) {
    const row = Math.floor(y / 4);
    const offset = (row % 2) * 5;
    const seam = y % 4 === 0 ? -30 : 0;
    const joint = (x + offset) % 9 === 0 ? -24 : 0;
    return shade(base, seam + joint + n * 0.4);
  }
  if (/brick|stone_bricks|deepslate_bricks|nether_bricks|quartz_bricks/.test(lower)) {
    const row = Math.floor(y / 4);
    const offset = (row % 2) * 4;
    const mortar = y % 4 === 0 || (x + offset) % 8 === 0;
    return mortar ? shade(base, -48) : shade(base, n);
  }
  if (/ore/.test(lower)) {
    return rnd() > 0.86 ? shade(mix(base, "#ffffff", 0.45), 12) : shade(base, n);
  }
  if (/grass/.test(lower)) {
    const edge = Math.floor(size * 0.3 + hashNoise(x, 3) * 3);
    const green = y < edge ? mix(base, "#5aa33c", 0.75) : base;
    return shade(green, n * 0.6);
  }
  if (/glass/.test(lower)) {
    const border = x === 0 || y === 0 || x === size - 1 || y === size - 1;
    return border ? shade(base, -32) : shade(mix(base, "#ffffff", 0.42), n * 0.25);
  }
  if (/water|lava|flow|portal/.test(lower)) {
    const wave = Math.sin((x / size) * Math.PI * 3 + y * 0.65) * 11;
    return shade(base, n + wave);
  }
  if (/dirt|sand|gravel|snow|wool|concrete|clay/.test(lower)) {
    const speck = rnd() > 0.9 ? -18 : rnd() > 0.9 ? 14 : 0;
    return shade(base, n * 0.55 + speck);
  }
  if (/wool|carpet/.test(lower)) return shade(base, n * 0.4);
  return shade(base, n);
}

/** Returns a normalized shape distance: <=1 inside, >0.8 is the rim. */
function iconShape(x: number, y: number, size: number, category: string): number {
  const c = (size - 1) / 2;
  const dx = x - c;
  const dy = y - c;
  if (category === "items" || category === "misc") {
    return (Math.abs(dx) + Math.abs(dy)) / (size * 0.43);
  }
  if (category === "entity") {
    const ellipse = Math.pow(dx / (size * 0.31), 2) + Math.pow(dy / (size * 0.4), 2);
    const legs = y > size * 0.76 && (Math.abs(dx - size * 0.16) < size * 0.07 || Math.abs(dx + size * 0.16) < size * 0.07);
    return legs ? 0.9 : ellipse;
  }
  if (category === "gui") {
    const m = size * 0.14;
    return Math.max(Math.abs(dx), Math.abs(dy)) / (size / 2 - m);
  }
  return Math.sqrt(dx * dx + dy * dy) / (size * 0.44);
}

export function generateTexture(input: GenInput): TextureData {
  const { size, category } = input;
  const rnd = mulberry32(hashString(input.path));
  const base = baseColor(`${input.name} ${input.path}`);
  const lower = input.name.toLowerCase();
  const flat = !["blocks", "environment", "particle", "painting"].includes(category);
  const pixels: string[] = [];

  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      if (flat) {
        const v = iconShape(x, y, size, category);
        if (v > 1) {
          pixels.push(TRANSPARENT);
          continue;
        }
        let color = shade(base, Math.floor(rnd() * 14) - 7);
        if (v > 0.82) color = shade(base, -62);
        else if (x + y < size * 0.7) color = shade(color, 18);

        if (category === "entity") {
          const c = (size - 1) / 2;
          const eyeY = Math.round(c - size * 0.08);
          const eyeX = Math.round(size * 0.14);
          if ((Math.abs(x - (c - eyeX)) <= 2 || Math.abs(x - (c + eyeX)) <= 2) && Math.abs(y - eyeY) <= 2) {
            color = "#161616ff";
          }
        }
        pixels.push(color);
      } else {
        pixels.push(blockPixel(x, y, size, base, lower, rnd));
      }
    }
  }
  return { width: size, height: size, pixels };
}

/* ------------------------------------------------------------------ */
/* image / pixel utilities                                             */
/* ------------------------------------------------------------------ */

export function pixelsToDataUrl(data: TextureData): string {
  const canvas = document.createElement("canvas");
  canvas.width = data.width;
  canvas.height = data.height;
  const ctx = canvas.getContext("2d")!;
  const image = ctx.createImageData(data.width, data.height);
  for (let i = 0; i < data.pixels.length; i++) {
    const [r, g, b, a] = parseHex(data.pixels[i] ?? TRANSPARENT);
    const o = i * 4;
    image.data[o] = r;
    image.data[o + 1] = g;
    image.data[o + 2] = b;
    image.data[o + 3] = a;
  }
  ctx.putImageData(image, 0, 0);
  return canvas.toDataURL("image/png");
}

export function dataUrlToBase64(dataUrl: string): string {
  const comma = dataUrl.indexOf(",");
  return comma >= 0 ? dataUrl.slice(comma + 1) : dataUrl;
}

export function readFileAsDataUrl(file: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(file);
  });
}

export async function decodeTexture(file: Blob, maxSize = 256): Promise<TextureData> {
  const url = await readFileAsDataUrl(file);
  const img = new Image();
  img.src = url;
  await img.decode();
  const scale = Math.min(1, maxSize / Math.max(img.naturalWidth, img.naturalHeight));
  const width = Math.max(1, Math.round(img.naturalWidth * scale));
  const height = Math.max(1, Math.round(img.naturalHeight * scale));
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d", { willReadFrequently: true })!;
  ctx.imageSmoothingEnabled = false;
  ctx.drawImage(img, 0, 0, width, height);
  const image = ctx.getImageData(0, 0, width, height);
  const pixels: string[] = [];
  for (let i = 0; i < image.data.length; i += 4) {
    pixels.push(
      toHex(
        image.data[i],
        image.data[i + 1],
        image.data[i + 2],
        image.data[i + 3],
      ),
    );
  }
  return { width, height, pixels };
}

export function resizeTexture(data: TextureData, width: number, height: number): TextureData {
  const pixels: string[] = [];
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const sx = Math.min(data.width - 1, Math.floor((x / width) * data.width));
      const sy = Math.min(data.height - 1, Math.floor((y / height) * data.height));
      pixels.push(data.pixels[sy * data.width + sx] ?? TRANSPARENT);
    }
  }
  return { width, height, pixels };
}

/** Draws pixel data into a canvas context with crisp scaling and transparency checker. */
export function drawTexture(
  ctx: CanvasRenderingContext2D,
  data: TextureData,
  destX: number,
  destY: number,
  destW: number,
  destH: number,
  checker = true,
): void {
  const cell = Math.max(4, Math.round(destW / 8));
  if (checker) {
    ctx.fillStyle = "#c9c9c9";
    ctx.fillRect(destX, destY, destW, destH);
    ctx.fillStyle = "#f2f2f2";
    for (let cy = 0; cy < destH; cy += cell) {
      for (let cx = 0; cx < destW; cx += cell) {
        if (((cx / cell) | 0) % 2 === ((cy / cell) | 0) % 2) {
          ctx.fillRect(destX + cx, destY + cy, Math.min(cell, destW - cx), Math.min(cell, destH - cy));
        }
      }
    }
  }
  const off = document.createElement("canvas");
  off.width = data.width;
  off.height = data.height;
  const offCtx = off.getContext("2d")!;
  const image = offCtx.createImageData(data.width, data.height);
  for (let i = 0; i < data.pixels.length; i++) {
    const [r, g, b, a] = parseHex(data.pixels[i] ?? TRANSPARENT);
    const o = i * 4;
    image.data[o] = r;
    image.data[o + 1] = g;
    image.data[o + 2] = b;
    image.data[o + 3] = a;
  }
  offCtx.putImageData(image, 0, 0);
  ctx.imageSmoothingEnabled = false;
  ctx.drawImage(off, destX, destY, destW, destH);
}
