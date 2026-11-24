"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import JSZip from "jszip";
import {
  ArrowLeft, Check, Download, FileArchive, FileDown, Filter, Image as ImageIcon,
  PackageOpen, Plus, RotateCcw, Search, Upload, X,
} from "lucide-react";
import PixelEditor from "./PixelEditor";
import {
  CATEGORIES, CATEGORY_LABELS, TEXTURE_CATALOG, vanillaUrl,
  type TextureCategory, type TextureEntry,
} from "@/lib/textures";
import { decodeTexture, drawTexture, generateTexture, type TextureData } from "@/lib/texture-gen";
import { buildResourcePack, downloadBlob, makeUuid, type PackMeta } from "@/lib/pack";

type Toast = { message: string; kind: "ok" | "error" };

function prettifyPath(path: string): string {
  const name = path.replace(/\.png$/i, "").split("/").pop() ?? path;
  return name.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
}

function TextureThumb({
  data,
  url,
  size = 38,
}: {
  data?: TextureData;
  url?: string;
  size?: number;
}) {
  const ref = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    if (!data) return;
    const canvas = ref.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (ctx) drawTexture(ctx, data, 0, 0, size, size, true);
  }, [data, size]);
  if (!data && url) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={url}
        width={size}
        height={size}
        loading="lazy"
        decoding="async"
        alt=""
        className="thumb-canvas thumb-img"
      />
    );
  }
  return <canvas ref={ref} width={size} height={size} className="thumb-canvas" />;
}

export default function ResourceStudio({ onBack }: { onBack: () => void }) {
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState<TextureCategory | "all">("all");
  const [selectedId, setSelectedId] = useState<string>("textures/blocks/stone");
  const [textureData, setTextureData] = useState<Record<string, TextureData>>({});
  const [vanillaCache, setVanillaCache] = useState<Record<string, TextureData>>({});
  const [editedPaths, setEditedPaths] = useState<Record<string, boolean>>({});
  const [importedPaths, setImportedPaths] = useState<Record<string, boolean>>({});
  const [customTextures, setCustomTextures] = useState<TextureEntry[]>([]);
  const [visibleCount, setVisibleCount] = useState(250);
  const [includeImported, setIncludeImported] = useState(true);
  const [busy, setBusy] = useState(false);
  const [toast, setToast] = useState<Toast | null>(null);
  const toastTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const cacheRef = useRef<Record<string, TextureData>>({});
  const loadingRef = useRef<Set<string>>(new Set());
  const zipInputRef = useRef<HTMLInputElement>(null);

  const [meta, setMeta] = useState<PackMeta>(() => ({
    name: "My Resource Pack",
    description: "Created with AddonBUILD",
    version: "1.0.0",
    minEngineVersion: "1.20.0",
    uuid: makeUuid(),
    moduleUuid: makeUuid(),
  }));

  const showToast = (message: string, kind: Toast["kind"] = "ok") => {
    setToast({ message, kind });
    if (toastTimer.current) clearTimeout(toastTimer.current);
    toastTimer.current = setTimeout(() => setToast(null), 3600);
  };

  const vanillaIds = useMemo(() => new Set(TEXTURE_CATALOG.map((t) => t.id)), []);
  const allTextures = useMemo(() => [...customTextures, ...TEXTURE_CATALOG], [customTextures]);
  const entryById = useMemo(() => {
    const map: Record<string, TextureEntry> = {};
    for (const entry of allTextures) map[entry.id] = entry;
    return map;
  }, [allTextures]);

  const filtered = useMemo(() => {
    const query = search.trim().toLowerCase().replace(/\.png$/i, "");
    return allTextures.filter((entry) => {
      if (category !== "all" && entry.category !== category) return false;
      if (!query) return true;
      return (
        entry.name.toLowerCase().includes(query) ||
        entry.id.toLowerCase().includes(query) ||
        entry.path.toLowerCase().includes(query)
      );
    });
  }, [allTextures, search, category]);

  useEffect(() => setVisibleCount(250), [search, category]);

  // Load the real vanilla PNG for the selected texture on demand.
  useEffect(() => {
    const id = selectedId;
    if (!id || textureData[id] || vanillaCache[id] || loadingRef.current.has(id)) return;
    const entry = entryById[id];
    if (!entry || !vanillaIds.has(id)) return;

    loadingRef.current.add(id);
    fetch(vanillaUrl(entry))
      .then((res) => {
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        return res.blob();
      })
      .then((blob) => decodeTexture(blob, 512))
      .then((data) => {
        setVanillaCache((prev) => ({ ...prev, [id]: data }));
        cacheRef.current[id] = data;
      })
      .catch((err) => console.warn(`Could not load ${entry.path}`, err))
      .finally(() => loadingRef.current.delete(id));
  }, [selectedId, textureData, vanillaCache, entryById, vanillaIds]);

  const getData = (id: string): TextureData => {
    if (textureData[id]) return textureData[id];
    if (vanillaCache[id]) return vanillaCache[id];
    if (!cacheRef.current[id]) {
      const entry = entryById[id];
      cacheRef.current[id] = entry
        ? generateTexture(entry)
        : { width: 16, height: 16, pixels: Array(256).fill("#00000000") };
    }
    return cacheRef.current[id];
  };

  const selectedEntry = entryById[selectedId] ?? allTextures[0];
  const selectedData = getData(selectedId);

  const handleTextureChange = (next: TextureData) => {
    if (!selectedId) return;
    cacheRef.current[selectedId] = next;
    setTextureData((prev) => ({ ...prev, [selectedId]: next }));
    setEditedPaths((prev) => ({ ...prev, [selectedId]: true }));
  };

  const resetTexture = () => {
    if (!selectedId) return;
    const next = { ...textureData };
    delete next[selectedId];
    setTextureData(next);
    const edited = { ...editedPaths };
    delete edited[selectedId];
    setEditedPaths(edited);
    const imported = { ...importedPaths };
    delete imported[selectedId];
    setImportedPaths(imported);
    delete cacheRef.current[selectedId];
    showToast("Texture reset to the original vanilla image.");
  };

  const addCustomTexture = () => {
    const raw = window.prompt("Texture path (e.g. textures/blocks/my_block.png)");
    if (!raw) return;
    let path = raw.trim().replace(/\\/g, "/").replace(/^\/+/, "");
    if (!path.toLowerCase().endsWith(".png")) path += ".png";
    if (!path.startsWith("textures/")) path = `textures/${path}`;
    const id = path.replace(/\.png$/i, "");
    if (entryById[id]) {
      setSelectedId(id);
      showToast("That texture already exists — selected it instead.");
      return;
    }
    const folder = path.split("/")[1] as TextureCategory;
    const cat: TextureCategory = CATEGORIES.includes(folder) ? folder : "misc";
    const entry: TextureEntry = { id, path, name: prettifyPath(path), category: cat, size: 16 };
    setCustomTextures((prev) => [entry, ...prev]);
    setSelectedId(id);
    setSearch("");
    setCategory("all");
    showToast(`Added ${path}`);
  };

  const importPack = async (file: File | undefined) => {
    if (!file) return;
    setBusy(true);
    try {
      const zip = await JSZip.loadAsync(file);
      const pngFiles = Object.values(zip.files).filter(
        (f) => !f.dir && /\.png$/i.test(f.name) && /(^|\/)textures\//i.test(f.name),
      );
      if (!pngFiles.length) {
        showToast("No textures/ PNG files found in that archive.", "error");
        return;
      }
      const entries: TextureEntry[] = [];
      const data: Record<string, TextureData> = {};
      const imported: Record<string, boolean> = {};
      const known = new Set(allTextures.map((t) => t.id));

      for (let i = 0; i < pngFiles.length; i += 16) {
        const chunk = pngFiles.slice(i, i + 16);
        const results = await Promise.all(
          chunk.map(async (f) => {
            const blob = await f.async("blob");
            const texture = await decodeTexture(blob, 256);
            return { name: f.name, texture };
          }),
        );
        for (const result of results) {
          const path = result.name.replace(/\\/g, "/").replace(/^\/+/, "");
          const id = path.replace(/\.png$/i, "");
          data[id] = result.texture;
          cacheRef.current[id] = result.texture;
          imported[id] = true;
          if (!known.has(id)) {
            const folder = path.split("/")[1] as TextureCategory;
            const cat: TextureCategory = CATEGORIES.includes(folder) ? folder : "misc";
            entries.push({ id, path, name: prettifyPath(path), category: cat, size: result.texture.width });
          }
        }
      }

      setTextureData((prev) => ({ ...prev, ...data }));
      setImportedPaths((prev) => ({ ...prev, ...imported }));
      if (entries.length) setCustomTextures((prev) => [...entries, ...prev]);
      const first = pngFiles[0].name.replace(/\.png$/i, "");
      setSelectedId(first);
      setSearch("");
      setCategory("all");
      showToast(`Loaded ${pngFiles.length} textures from ${file.name}.`);
    } catch (err) {
      console.error(err);
      showToast("Could not read that archive. Is it a valid .zip / .mcpack?", "error");
    } finally {
      setBusy(false);
    }
  };

  const overrideIds = useMemo(() => {
    const ids = new Set([...Object.keys(editedPaths)]);
    if (includeImported) Object.keys(importedPaths).forEach((id) => ids.add(id));
    return [...ids];
  }, [editedPaths, importedPaths, includeImported]);

  const exportPack = async (extension: "zip" | "mcpack") => {
    if (!overrideIds.length) {
      showToast("Edit a texture (or import a pack) before exporting.", "error");
      return;
    }
    setBusy(true);
    try {
      const textures = overrideIds.map((id) => ({ path: `${id}.png`, data: getData(id) }));
      const blob = await buildResourcePack(meta, textures);
      const slug = meta.name.trim().toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "") || "resource-pack";
      downloadBlob(blob, `${slug}.${extension}`);
      showToast(`Exported ${textures.length} textures as ${slug}.${extension}`);
    } catch (err) {
      console.error(err);
      showToast("Export failed — see the console for details.", "error");
    } finally {
      setBusy(false);
    }
  };

  const setMetaField = (field: keyof PackMeta, value: string) =>
    setMeta((prev) => ({ ...prev, [field]: value }));

  return (
    <div className="studio">
      <header className="studio-header">
        <button className="back-btn" onClick={onBack}><ArrowLeft size={18} /> Back</button>
        <div className="studio-title">
          <div className="studio-title-icon resource"><ImageIcon size={20} /></div>
          <div><h1>Resource Pack Studio</h1><span>Paint every texture in the game</span></div>
        </div>
        <div className="studio-header-actions">
          <span className="count-badge">{TEXTURE_CATALOG.length.toLocaleString()} real game textures</span>
          <button className="primary-btn" disabled={busy} onClick={() => exportPack("zip")}>
            <Download size={17} /> Export .zip
          </button>
        </div>
      </header>

      <div className="studio-body resource-body">
        {/* Texture browser */}
        <aside className="panel browser-panel">
          <div className="panel-heading"><span><Filter size={16} /> Texture Browser</span></div>
          <div className="browser-controls">
            <div className="search-box">
              <Search size={16} />
              <input
                placeholder="Search textures or paths..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
              {search && <button onClick={() => setSearch("")}><X size={14} /></button>}
            </div>
            <div className="category-chips">
              <button className={category === "all" ? "active" : ""} onClick={() => setCategory("all")}>All</button>
              {CATEGORIES.map((c) => (
                <button key={c} className={category === c ? "active" : ""} onClick={() => setCategory(c)}>
                  {CATEGORY_LABELS[c]}
                </button>
              ))}
            </div>
            <div className="browser-meta">
              <span>{filtered.length.toLocaleString()} results</span>
              <button className="link-btn" onClick={addCustomTexture}><Plus size={13} /> Custom</button>
            </div>
          </div>
          <div className="texture-list">
            {filtered.slice(0, visibleCount).map((entry) => {
              const data = getData(entry.id);
              return (
                <button
                  key={entry.id}
                  className={`texture-row ${selectedId === entry.id ? "active" : ""}`}
                  onClick={() => setSelectedId(entry.id)}
                  title={entry.path}
                >
                  <TextureThumb
                    data={
                      editedPaths[entry.id] || importedPaths[entry.id] || !vanillaIds.has(entry.id)
                        ? data
                        : undefined
                    }
                    url={vanillaIds.has(entry.id) ? vanillaUrl(entry) : undefined}
                  />
                  <span className="texture-row-label">
                    <strong>{entry.name}</strong>
                    <small>{entry.path}</small>
                  </span>
                  {editedPaths[entry.id] && <span className="dot-edited" title="Edited" />}
                </button>
              );
            })}
            {!filtered.length && <div className="empty-state">No textures match your search.</div>}
            {visibleCount < filtered.length && (
              <button className="load-more" onClick={() => setVisibleCount((v) => v + 250)}>
                Load more ({filtered.length - visibleCount} remaining)
              </button>
            )}
          </div>
          <div className="browser-footer">
            <input
              ref={zipInputRef}
              type="file"
              accept=".zip,.mcpack"
              hidden
              onChange={(e) => { importPack(e.target.files?.[0]); e.target.value = ""; }}
            />
            <button className="wide-ghost-btn" onClick={() => zipInputRef.current?.click()} disabled={busy}>
              <Upload size={15} /> {busy ? "Loading..." : "Import texture pack (.zip / .mcpack)"}
            </button>
          </div>
        </aside>

        {/* Editor */}
        <main className="panel editor-panel">
          <div className="editor-heading">
            <div>
              <span className="eyebrow">NOW EDITING</span>
              <h2>{selectedEntry?.name ?? "No texture selected"}</h2>
              <code>{selectedEntry?.path ?? ""}</code>
            </div>
            <button className="ghost-btn" onClick={resetTexture}><RotateCcw size={14} /> Reset</button>
          </div>
          {selectedEntry && (
            <PixelEditor
              key={selectedId}
              textureKey={selectedId}
              name={selectedEntry.name}
              data={selectedData}
              onChange={handleTextureChange}
            />
          )}
        </main>

        {/* Pack details */}
        <aside className="panel details-panel">
          <div className="panel-heading"><span><PackageOpen size={16} /> Pack Details</span></div>
          <div className="detail-fields">
            <label>Pack name<input value={meta.name} onChange={(e) => setMetaField("name", e.target.value)} /></label>
            <label>Description<textarea rows={2} value={meta.description} onChange={(e) => setMetaField("description", e.target.value)} /></label>
            <div className="field-row">
              <label>Version<input value={meta.version} onChange={(e) => setMetaField("version", e.target.value)} /></label>
              <label>Min engine<input value={meta.minEngineVersion} onChange={(e) => setMetaField("minEngineVersion", e.target.value)} /></label>
            </div>
          </div>

          <div className="panel-heading sub"><span><FileArchive size={16} /> Changes ({overrideIds.length})</span></div>
          <div className="changes-list">
            {overrideIds.length === 0 && <div className="empty-state small">Nothing changed yet. Paint a texture to get started.</div>}
            {overrideIds.map((id) => (
              <div key={id} className="change-row">
                <TextureThumb data={getData(id)} size={26} />
                <span title={`${id}.png`}>{prettifyPath(id)}</span>
                {importedPaths[id] && !editedPaths[id] && <span className="tag imported">imported</span>}
                {editedPaths[id] && <span className="tag edited">edited</span>}
                <button
                  title="Remove override"
                  onClick={() => {
                    const d = { ...textureData }; delete d[id]; setTextureData(d);
                    const e = { ...editedPaths }; delete e[id]; setEditedPaths(e);
                    const im = { ...importedPaths }; delete im[id]; setImportedPaths(im);
                    delete cacheRef.current[id];
                  }}
                ><X size={13} /></button>
              </div>
            ))}
          </div>

          <label className="check-row">
            <input type="checkbox" checked={includeImported} onChange={(e) => setIncludeImported(e.target.checked)} />
            <span>Include imported textures in export</span>
          </label>

          <div className="export-box">
            <button className="primary-btn wide" disabled={busy} onClick={() => exportPack("zip")}>
              <Download size={17} /> {busy ? "Building..." : "Download .zip"}
            </button>
            <button className="ghost-btn wide" disabled={busy} onClick={() => exportPack("mcpack")}>
              <FileDown size={16} /> Download .mcpack
            </button>
            <p className="export-note">
              Exports <code>manifest.json</code>, <code>pack_icon.png</code> and every changed texture at its
              original path so it overrides vanilla art.
            </p>
          </div>

          <div className="tip-box">
            <Check size={15} />
            <span>Tip: import a vanilla resource pack .zip first, then edit the real textures directly — they will be re-packed on export.</span>
          </div>
        </aside>
      </div>

      {toast && <div className={`toast ${toast.kind}`}>{toast.message}</div>}
    </div>
  );
}
