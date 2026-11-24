"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import JSZip from "jszip";
import {
  ArrowLeft, Check, Download, Eye, FileArchive, Filter, Image as ImageIcon,
  PackageOpen, Plus, RotateCcw, Search, Star, Upload, X,
} from "lucide-react";
import PixelEditor from "./PixelEditor";
import ExportDialog, { type PackFormat } from "./ExportDialog";
import { Field, Modal } from "./ui";
import { useApp } from "./AppProvider";
import {
  CATEGORIES, CATEGORY_LABELS, TEXTURE_CATALOG, vanillaUrl,
  type TextureCategory, type TextureEntry,
} from "@/lib/textures";
import { decodeTexture, drawTexture, generateTexture, type TextureData } from "@/lib/texture-gen";
import { buildResourcePack, downloadBlob, makeUuid, type PackMeta } from "@/lib/pack";
import {
  STORAGE_KEYS, readStorage, slug, writeStorage, type Project,
} from "@/lib/store";

const RESOURCE_FORMATS = ["zip", "mcpack"] as const;

interface ResourceProjectData {
  textureData: Record<string, TextureData>;
  editedPaths: Record<string, boolean>;
  importedPaths: Record<string, boolean>;
  customTextures: TextureEntry[];
  includeImported: boolean;
  selectedId: string;
  starter?: string;
}

function emptyProjectData(): ResourceProjectData {
  return {
    textureData: {},
    editedPaths: {},
    importedPaths: {},
    customTextures: [],
    includeImported: true,
    selectedId: "textures/blocks/stone",
  };
}

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
  const {
    activeProject, projects, openProject, updateProject, showToast, log, markSaved,
    settings, favorites, setFavorites, recentTextures, setRecentTextures,
  } = useApp();

  const projectId = activeProject?.type === "resource" ? activeProject.id : null;
  const [fallbackMeta, setFallbackMeta] = useState<PackMeta>(() => ({
    name: "My Resource Pack",
    description: "Created with AddonBUILD 2.0",
    version: "1.0.0",
    minEngineVersion: "1.20.0",
    uuid: makeUuid(),
    moduleUuid: makeUuid(),
  }));
  const meta = activeProject?.meta ?? fallbackMeta;

  const [search, setSearch] = useState("");
  const [category, setCategory] = useState<TextureCategory | "all">("all");
  const [favoritesOnly, setFavoritesOnly] = useState(false);
  const [selectedId, setSelectedId] = useState<string>("textures/blocks/stone");
  const [textureData, setTextureData] = useState<Record<string, TextureData>>({});
  const [vanillaCache, setVanillaCache] = useState<Record<string, TextureData>>({});
  const [editedPaths, setEditedPaths] = useState<Record<string, boolean>>({});
  const [importedPaths, setImportedPaths] = useState<Record<string, boolean>>({});
  const [customTextures, setCustomTextures] = useState<TextureEntry[]>([]);
  const [includeImported, setIncludeImported] = useState(true);
  const [visibleCount, setVisibleCount] = useState(250);
  const [compare, setCompare] = useState(false);
  const [busy, setBusy] = useState(false);
  const [exportOpen, setExportOpen] = useState(false);
  const [customOpen, setCustomOpen] = useState(false);
  const [customPath, setCustomPath] = useState("");
  const [loadedFor, setLoadedFor] = useState<string | null>(null);
  const cacheRef = useRef<Record<string, TextureData>>({});
  const loadingRef = useRef<Set<string>>(new Set());
  const zipInputRef = useRef<HTMLInputElement>(null);

  const resourceProjects = useMemo(
    () => projects.filter((project) => project.type === "resource").sort((a, b) => b.updatedAt - a.updatedAt),
    [projects],
  );

  // Load this project's saved texture edits whenever the active project changes.
  useEffect(() => {
    const stored = projectId
      ? readStorage<ResourceProjectData | null>(STORAGE_KEYS.projectData(projectId, "resource"), null)
      : null;
    const data = stored ?? emptyProjectData();
    setTextureData(data.textureData ?? {});
    setEditedPaths(data.editedPaths ?? {});
    setImportedPaths(data.importedPaths ?? {});
    setCustomTextures(data.customTextures ?? []);
    setIncludeImported(data.includeImported ?? true);
    setSelectedId(data.selectedId ?? data.starter ?? "textures/blocks/stone");
    cacheRef.current = { ...(data.textureData ?? {}) };
    loadingRef.current.clear();
    setLoadedFor(projectId ?? "none");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [projectId]);

  // Autosave editor progress into the active project.
  useEffect(() => {
    if (!projectId || loadedFor !== projectId || !settings.autosave) return;
    writeStorage<ResourceProjectData>(STORAGE_KEYS.projectData(projectId, "resource"), {
      textureData,
      editedPaths,
      importedPaths,
      customTextures,
      includeImported,
      selectedId,
    });
    markSaved();
  }, [
    projectId, loadedFor, settings.autosave, textureData, editedPaths, importedPaths,
    customTextures, includeImported, selectedId, markSaved,
  ]);

  useEffect(() => {
    if (!selectedId) return;
    setRecentTextures((prev) =>
      prev[0] === selectedId ? prev : [selectedId, ...prev.filter((id) => id !== selectedId)].slice(0, 12),
    );
  }, [selectedId, setRecentTextures]);

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
      if (favoritesOnly && !favorites.includes(entry.id)) return false;
      if (!query) return true;
      return (
        entry.name.toLowerCase().includes(query) ||
        entry.id.toLowerCase().includes(query) ||
        entry.path.toLowerCase().includes(query)
      );
    });
  }, [allTextures, search, category, favoritesOnly, favorites]);

  useEffect(() => setVisibleCount(250), [search, category, favoritesOnly]);

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
  const originalData = vanillaCache[selectedId]
    ?? (selectedEntry && vanillaIds.has(selectedId) ? generateTexture(selectedEntry) : null);
  const isFavorite = favorites.includes(selectedId);

  const setMetaField = (field: keyof PackMeta, value: string) => {
    const next = { ...meta, [field]: value };
    if (projectId && activeProject) {
      const patch: Partial<Project> = { meta: next };
      if (field === "name") patch.name = value;
      if (field === "description") patch.description = value;
      updateProject(projectId, patch);
    } else {
      setFallbackMeta(next);
    }
  };

  const handleTextureChange = (next: TextureData) => {
    if (!selectedId) return;
    const firstEdit = !editedPaths[selectedId];
    cacheRef.current[selectedId] = next;
    setTextureData((prev) => ({ ...prev, [selectedId]: next }));
    if (firstEdit) {
      setEditedPaths((prev) => ({ ...prev, [selectedId]: true }));
      log(`Edited ${selectedEntry?.name ?? selectedId}`, "edit");
    }
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
    showToast("Texture reset to the original vanilla image.", "info");
  };

  const removeOverride = (id: string) => {
    const data = { ...textureData };
    delete data[id];
    setTextureData(data);
    const edited = { ...editedPaths };
    delete edited[id];
    setEditedPaths(edited);
    const imported = { ...importedPaths };
    delete imported[id];
    setImportedPaths(imported);
    delete cacheRef.current[id];
  };

  const commitCustomTexture = () => {
    let path = customPath.trim().replace(/\\/g, "/").replace(/^\/+/, "");
    if (!path) return;
    if (!path.toLowerCase().endsWith(".png")) path += ".png";
    if (!path.startsWith("textures/")) path = `textures/${path}`;
    const id = path.replace(/\.png$/i, "");
    if (entryById[id]) {
      setSelectedId(id);
      showToast("That texture already exists — selected it instead.", "info");
    } else {
      const folder = path.split("/")[1] as TextureCategory;
      const cat: TextureCategory = CATEGORIES.includes(folder) ? folder : "misc";
      const entry: TextureEntry = { id, path, name: prettifyPath(path), category: cat, size: 16 };
      setCustomTextures((prev) => [entry, ...prev]);
      setSelectedId(id);
      setSearch("");
      setCategory("all");
      log(`Added custom texture ${path}`, "create");
      showToast(`Added ${path}`);
    }
    setCustomOpen(false);
    setCustomPath("");
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
      log(`Imported ${pngFiles.length} textures from ${file.name}`, "import");
      showToast(`Loaded ${pngFiles.length} textures from ${file.name}.`);
    } catch (err) {
      console.error(err);
      showToast("Could not read that archive. Is it a valid .zip / .mcpack?", "error");
    } finally {
      setBusy(false);
    }
  };

  const overrideIds = useMemo(() => {
    const ids = new Set(Object.keys(editedPaths));
    if (includeImported) Object.keys(importedPaths).forEach((id) => ids.add(id));
    return [...ids];
  }, [editedPaths, importedPaths, includeImported]);

  const doExport = async (format: PackFormat) => {
    if (!overrideIds.length) {
      showToast("Edit a texture (or import a pack) before exporting.", "error");
      return;
    }
    setBusy(true);
    try {
      const textures = overrideIds.map((id) => ({ path: `${id}.png`, data: getData(id) }));
      const blob = await buildResourcePack(meta, textures);
      const filename = `${slug(meta.name)}.${format}`;
      downloadBlob(blob, filename);
      log(`Exported ${meta.name} as ${filename}`, "export");
      showToast(`Exported ${textures.length} textures as ${filename}`);
      setExportOpen(false);
    } catch (err) {
      console.error(err);
      showToast("Export failed — see the console for details.", "error");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="studio">
      <header className="studio-header">
        <button className="back-btn" onClick={onBack}><ArrowLeft size={18} /> Back</button>
        <div className="studio-title">
          <div className="studio-title-icon resource"><ImageIcon size={20} /></div>
          <div>
            <h1>Resource Studio</h1>
            <span>Paint every texture in the game</span>
            <select
              className="project-switcher"
              value={projectId ?? ""}
              onChange={(event) => openProject(event.target.value, "resource")}
              aria-label="Active resource project"
            >
              {!projectId && <option value="">No project selected</option>}
              {resourceProjects.map((project) => (
                <option key={project.id} value={project.id}>{project.name}</option>
              ))}
            </select>
          </div>
        </div>
        <div className="studio-header-actions">
          <span className="count-badge">{TEXTURE_CATALOG.length.toLocaleString()} real game textures</span>
          <button className="btn-v2 primary" onClick={() => setExportOpen(true)}>
            <Download size={16} /> Export pack
          </button>
        </div>
      </header>

      <div className="studio-body resource-body">
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
              {search && <button onClick={() => setSearch("")} aria-label="Clear search"><X size={14} /></button>}
            </div>
            <div className="category-chips">
              <button className={favoritesOnly ? "active" : ""} onClick={() => setFavoritesOnly((v) => !v)}>
                <Star size={12} /> Favorites
              </button>
              <button className={category === "all" && !favoritesOnly ? "active" : ""} onClick={() => { setCategory("all"); setFavoritesOnly(false); }}>
                All
              </button>
              {CATEGORIES.map((c) => (
                <button key={c} className={category === c ? "active" : ""} onClick={() => { setCategory(c); setFavoritesOnly(false); }}>
                  {CATEGORY_LABELS[c]}
                </button>
              ))}
            </div>
            {recentTextures.length > 0 && (
              <div className="recent-textures">
                <span>Recent</span>
                {recentTextures.slice(0, 6).map((id) => (
                  <button key={id} onClick={() => setSelectedId(id)} title={id}>
                    {entryById[id]?.name ?? prettifyPath(id)}
                  </button>
                ))}
              </div>
            )}
            <div className="browser-meta">
              <span>{filtered.length.toLocaleString()} results</span>
              <button className="link-btn" onClick={() => setCustomOpen(true)}><Plus size={13} /> Custom</button>
            </div>
          </div>
          <div className="texture-list">
            {filtered.slice(0, visibleCount).map((entry) => (
              <button
                key={entry.id}
                className={`texture-row ${selectedId === entry.id ? "active" : ""}`}
                onClick={() => setSelectedId(entry.id)}
                title={entry.path}
              >
                <TextureThumb
                  data={
                    editedPaths[entry.id] || importedPaths[entry.id] || !vanillaIds.has(entry.id)
                      ? getData(entry.id)
                      : undefined
                  }
                  url={vanillaIds.has(entry.id) ? vanillaUrl(entry) : undefined}
                />
                <span className="texture-row-label">
                  <strong>{entry.name}</strong>
                  <small>{entry.path}</small>
                </span>
                {favorites.includes(entry.id) && <Star size={12} className="row-star" fill="currentColor" />}
                {editedPaths[entry.id] && <span className="dot-edited" title="Edited" />}
              </button>
            ))}
            {!filtered.length && <div className="empty-state">No textures match your search.</div>}
            {visibleCount < filtered.length && (
              <button className="load-more" onClick={() => setVisibleCount((v) => v + 250)}>
                Load more ({(filtered.length - visibleCount).toLocaleString()} remaining)
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

        <main className="panel editor-panel">
          <div className="editor-heading">
            <div>
              <span className="eyebrow">NOW EDITING</span>
              <h2>{selectedEntry?.name ?? "No texture selected"}</h2>
              <code>{selectedEntry?.path ?? ""}</code>
            </div>
            <div className="editor-heading-actions">
              <button
                className={`icon-btn ${isFavorite ? "favorite" : ""}`}
                title={isFavorite ? "Remove from favorites" : "Add to favorites"}
                onClick={() =>
                  setFavorites((prev) =>
                    isFavorite ? prev.filter((id) => id !== selectedId) : [...prev, selectedId],
                  )
                }
              >
                <Star size={16} fill={isFavorite ? "currentColor" : "none"} />
              </button>
              <button className="ghost-btn" onClick={() => setCompare((v) => !v)}>
                <Eye size={14} /> {compare ? "Hide compare" : "Compare"}
              </button>
              <button className="ghost-btn" onClick={resetTexture}><RotateCcw size={14} /> Reset</button>
            </div>
          </div>
          {compare && (
            <div className="compare-panel">
              <div>
                <span>Original vanilla</span>
                {originalData ? <TextureThumb data={originalData} size={96} /> : <p>Custom texture — no original</p>}
              </div>
              <div>
                <span>Your version</span>
                <TextureThumb data={selectedData} size={96} />
              </div>
            </div>
          )}
          {selectedEntry && (
            <PixelEditor
              key={selectedId}
              textureKey={selectedId}
              name={selectedEntry.name}
              data={selectedData}
              onChange={handleTextureChange}
              defaultShowGrid={settings.showGrid}
            />
          )}
        </main>

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
                <button title="Remove override" onClick={() => removeOverride(id)}><X size={13} /></button>
              </div>
            ))}
          </div>

          <label className="check-row">
            <input type="checkbox" checked={includeImported} onChange={(e) => setIncludeImported(e.target.checked)} />
            <span>Include imported textures in export</span>
          </label>

          <div className="export-box">
            <button className="primary-btn wide" onClick={() => setExportOpen(true)}>
              <Download size={17} /> Download pack
            </button>
            <p className="export-note">
              Exports <code>manifest.json</code>, <code>pack_icon.png</code> and every changed texture at its
              original path so it overrides vanilla art.
            </p>
          </div>

          <div className="tip-box">
            <Check size={15} />
            <span>Tip: import a resource pack .zip first, then edit the real textures directly — they will be re-packed on export.</span>
          </div>
        </aside>
      </div>

      <ExportDialog
        open={exportOpen}
        onClose={() => setExportOpen(false)}
        title="Export resource pack"
        description="Your changed and imported textures are packed at their original vanilla paths."
        formats={RESOURCE_FORMATS}
        onExport={doExport}
        busy={busy}
        count={`${overrideIds.length} texture override${overrideIds.length === 1 ? "" : "s"} ready`}
      />

      <Modal
        open={customOpen}
        onClose={() => setCustomOpen(false)}
        title="Add a custom texture"
        subtitle="Use the same path layout as the vanilla game."
        footer={
          <>
            <button className="btn-v2" onClick={() => setCustomOpen(false)}>Cancel</button>
            <button className="btn-v2 primary" disabled={!customPath.trim()} onClick={commitCustomTexture}>
              <Plus size={15} /> Add texture
            </button>
          </>
        }
      >
        <Field label="Texture path" hint="Example: textures/blocks/my_block.png">
          <input
            autoFocus
            value={customPath}
            onChange={(e) => setCustomPath(e.target.value)}
            onKeyDown={(e) => { if (e.key === "Enter") commitCustomTexture(); }}
            placeholder="textures/blocks/my_block.png"
          />
        </Field>
      </Modal>
    </div>
  );
}
