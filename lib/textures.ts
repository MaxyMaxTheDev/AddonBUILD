import vanillaPaths from "./vanilla-textures.json";

export type TextureCategory =
  | "blocks"
  | "items"
  | "entity"
  | "gui"
  | "ui"
  | "environment"
  | "particle"
  | "particles"
  | "painting"
  | "models"
  | "misc"
  | "map"
  | "trims"
  | "colormap"
  | "persona_thumbnails"
  | "mob_effect";

export interface TextureEntry {
  /** Path without extension — unique key, e.g. "textures/blocks/stone" */
  id: string;
  /** Full path inside the pack, e.g. "textures/blocks/stone.png" */
  path: string;
  /** Human readable label */
  name: string;
  category: TextureCategory;
  /** Hint used only while the real image is loading */
  size: number;
}

export const CATEGORY_LABELS: Record<TextureCategory, string> = {
  blocks: "Blocks",
  items: "Items",
  entity: "Entities",
  gui: "GUI",
  ui: "UI",
  environment: "Environment",
  particle: "Particles",
  particles: "Particles",
  painting: "Paintings",
  models: "Models",
  misc: "Misc",
  map: "Maps",
  trims: "Trims",
  colormap: "Colormaps",
  persona_thumbnails: "Persona",
  mob_effect: "Effects",
};

/** Official Mojang sample assets — textures are loaded on demand, not bundled. */
export const VANILLA_BASE_URL =
  "https://raw.githubusercontent.com/Mojang/bedrock-samples/main/resource_pack/";

export function vanillaUrl(entry: TextureEntry): string {
  return `${VANILLA_BASE_URL}${entry.path}`;
}

function prettify(relativePath: string): string {
  const file = relativePath.split("/").pop() ?? relativePath;
  return file
    .replace(/\.png$/i, "")
    .replace(/_/g, " ")
    .replace(/\b\w/g, (c) => c.toUpperCase());
}

function sizeHint(category: TextureCategory): number {
  if (category === "entity" || category === "models" || category === "persona_thumbnails") return 64;
  if (category === "particle" || category === "particles" || category === "colormap") return 8;
  return 16;
}

/** Every PNG in resource_pack/textures/ of Mojang's bedrock-samples repository. */
export const TEXTURE_CATALOG: TextureEntry[] = (vanillaPaths as string[]).map((relative) => {
  const segments = relative.split("/");
  const category = (segments.length > 1 ? segments[0] : "misc") as TextureCategory;
  const path = `textures/${relative}`;
  return {
    id: path.replace(/\.png$/i, ""),
    path,
    name: prettify(relative),
    category,
    size: sizeHint(category),
  };
});

const CATEGORY_ORDER: TextureCategory[] = [
  "blocks", "items", "entity", "gui", "ui", "environment", "particle", "particles",
  "painting", "models", "trims", "colormap", "map", "misc", "persona_thumbnails",
];

const present = new Set(TEXTURE_CATALOG.map((t) => t.category));
export const CATEGORIES: TextureCategory[] = [
  ...CATEGORY_ORDER.filter((c) => present.has(c)),
  ...[...present].filter((c) => !CATEGORY_ORDER.includes(c)),
];

export function findTexture(id: string): TextureEntry | undefined {
  return TEXTURE_CATALOG.find((t) => t.id === id);
}
