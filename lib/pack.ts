import JSZip from "jszip";
import { dataUrlToBase64, type TextureData, pixelsToDataUrl } from "./texture-gen";

export interface PackMeta {
  name: string;
  description: string;
  version: string;
  minEngineVersion: string;
  uuid: string;
  moduleUuid: string;
}

export interface PackFile {
  path: string;
  content: string;
}

export function makeUuid(): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) return crypto.randomUUID();
  return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    return (c === "x" ? r : (r & 0x3) | 0x8).toString(16);
  });
}

export function parseVersion(version: string): number[] {
  const parts = version.split(".").map((p) => parseInt(p, 10));
  return [parts[0] || 1, parts[1] || 0, parts[2] || 0];
}

function manifest(meta: PackMeta, moduleType: "resources" | "data"): string {
  return JSON.stringify(
    {
      format_version: 2,
      header: {
        name: meta.name,
        description: meta.description,
        uuid: meta.uuid,
        version: parseVersion(meta.version),
        min_engine_version: parseVersion(meta.minEngineVersion),
      },
      modules: [
        {
          type: moduleType,
          uuid: meta.moduleUuid,
          version: parseVersion(meta.version),
        },
      ],
    },
    null,
    2,
  );
}

/** Generates a chunky isometric-block pack icon as a PNG data URL. */
export function makePackIcon(accent: string, side: string, dark: string): string {
  const canvas = document.createElement("canvas");
  canvas.width = 128;
  canvas.height = 128;
  const ctx = canvas.getContext("2d")!;
  ctx.imageSmoothingEnabled = false;

  ctx.fillStyle = "#1b2620";
  ctx.fillRect(0, 0, 128, 128);
  ctx.fillStyle = "#24352a";
  for (let y = 0; y < 128; y += 16) {
    for (let x = 0; x < 128; x += 16) {
      if (((x / 16) | 0) % 2 === ((y / 16) | 0) % 2) ctx.fillRect(x, y, 16, 16);
    }
  }

  const poly = (points: number[][], color: string) => {
    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.moveTo(points[0][0], points[0][1]);
    for (let i = 1; i < points.length; i++) ctx.lineTo(points[i][0], points[i][1]);
    ctx.closePath();
    ctx.fill();
  };

  // faint shadow
  poly([[64, 108], [110, 84], [64, 60], [18, 84]], "#0d130f");
  // left face
  poly([[18, 40], [64, 64], [64, 112], [18, 88]], side);
  // right face
  poly([[110, 40], [64, 64], [64, 112], [110, 88]], dark);
  // top face
  poly([[64, 16], [110, 40], [64, 64], [18, 40]], accent);
  // pixel highlights on top
  ctx.fillStyle = "rgba(255,255,255,0.18)";
  ctx.fillRect(50, 33, 12, 6);
  ctx.fillRect(62, 39, 12, 6);
  ctx.fillStyle = "rgba(0,0,0,0.12)";
  ctx.fillRect(62, 27, 12, 6);

  return canvas.toDataURL("image/png");
}

export function downloadBlob(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 2000);
}

export async function buildResourcePack(
  meta: PackMeta,
  textures: { path: string; data: TextureData }[],
  extraFiles: PackFile[] = [],
): Promise<Blob> {
  const zip = new JSZip();
  zip.file("manifest.json", manifest(meta, "resources"));
  zip.file("pack_icon.png", dataUrlToBase64(makePackIcon("#7fbf4a", "#8d5f35", "#6b4728")), {
    base64: true,
  });
  for (const texture of textures) {
    zip.file(texture.path, dataUrlToBase64(pixelsToDataUrl(texture.data)), { base64: true });
  }
  for (const file of extraFiles) zip.file(file.path, file.content);
  return zip.generateAsync({ type: "blob", compression: "DEFLATE", compressionOptions: { level: 6 } });
}

export async function buildBehaviorPack(meta: PackMeta, files: PackFile[]): Promise<Blob> {
  const zip = new JSZip();
  zip.file("manifest.json", manifest(meta, "data"));
  zip.file("pack_icon.png", dataUrlToBase64(makePackIcon("#6ea8d8", "#4f7ea8", "#3c6187")), {
    base64: true,
  });
  for (const file of files) {
    if (file.path === "manifest.json" || file.path === "pack_icon.png") continue;
    zip.file(file.path, file.content);
  }
  return zip.generateAsync({ type: "blob", compression: "DEFLATE", compressionOptions: { level: 6 } });
}
