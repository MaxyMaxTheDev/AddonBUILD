"use client";

import { useMemo, useRef, useState } from "react";
import {
  ArrowLeft, Braces, Check, CheckCircle2, Code2, Download, FileCode2, FileJson,
  FilePlus2, FolderOpen, Hammer, Plus, RotateCcw, Sparkles, Trash2, Wand2, X,
} from "lucide-react";
import {
  BEHAVIOR_TEMPLATES, DEFAULT_BEHAVIOR_FILES, SNIPPETS,
} from "@/lib/behavior-templates";
import { buildBehaviorPack, downloadBlob, makeUuid, type PackFile, type PackMeta } from "@/lib/pack";
import BehaviorBuilder, { type GeneratedFile } from "./BehaviorBuilder";

type Toast = { message: string; kind: "ok" | "error" };

function jsonError(content: string): string | null {
  try { JSON.parse(content); return null; }
  catch (err) { return (err as Error).message; }
}

function CodeEditor({
  value,
  onChange,
  textareaRef,
}: {
  value: string;
  onChange: (value: string) => void;
  textareaRef: React.RefObject<HTMLTextAreaElement | null>;
}) {
  const lineRef = useRef<HTMLDivElement>(null);
  const lines = value.split("\n").length;
  return (
    <div className="code-editor">
      <div className="line-numbers" ref={lineRef}>
        {Array.from({ length: lines }, (_, i) => <div key={i}>{i + 1}</div>)}
      </div>
      <textarea
        ref={textareaRef}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onScroll={(e) => { if (lineRef.current) lineRef.current.scrollTop = e.currentTarget.scrollTop; }}
        spellCheck={false}
        aria-label="File contents"
      />
    </div>
  );
}

export default function BehaviorStudio({ onBack }: { onBack: () => void }) {
  const [files, setFiles] = useState<PackFile[]>(() => DEFAULT_BEHAVIOR_FILES.map((f) => ({ ...f })));
  const [activePath, setActivePath] = useState("entities/example_creature.json");
  const [meta, setMeta] = useState<PackMeta>(() => ({
    name: "My Behavior Pack",
    description: "Created with BlockForge",
    version: "1.0.0",
    minEngineVersion: "1.20.0",
    uuid: makeUuid(),
    moduleUuid: makeUuid(),
  }));
  const [mode, setMode] = useState<"quick" | "editor">("quick");
  const [showTemplates, setShowTemplates] = useState(false);
  const [renaming, setRenaming] = useState<string | null>(null);
  const [renameValue, setRenameValue] = useState("");
  const [toast, setToast] = useState<Toast | null>(null);
  const [busy, setBusy] = useState(false);
  const toastTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const showToast = (message: string, kind: Toast["kind"] = "ok") => {
    setToast({ message, kind });
    if (toastTimer.current) clearTimeout(toastTimer.current);
    toastTimer.current = setTimeout(() => setToast(null), 3600);
  };

  const activeFile = files.find((f) => f.path === activePath) ?? files[0];

  const updateActive = (content: string) => {
    if (!activeFile) return;
    setFiles((prev) => prev.map((f) => (f.path === activeFile.path ? { ...f, content } : f)));
  };

  const activeError = useMemo(
    () => (activeFile && activeFile.path.endsWith(".json") ? jsonError(activeFile.content) : null),
    [activeFile],
  );

  const invalidFiles = useMemo(
    () => files.filter((f) => f.path.endsWith(".json") && jsonError(f.content)),
    [files],
  );

  const folders = useMemo(() => {
    const groups: Record<string, PackFile[]> = {};
    for (const file of files) {
      const idx = file.path.lastIndexOf("/");
      const folder = idx === -1 ? "(root)" : file.path.slice(0, idx);
      if (!groups[folder]) groups[folder] = [];
      groups[folder].push(file);
    }
    return Object.entries(groups).sort(([a], [b]) => (a === "(root)" ? -1 : b === "(root)" ? 1 : a.localeCompare(b)));
  }, [files]);

  const addTemplate = (template: (typeof BEHAVIOR_TEMPLATES)[number]) => {
    let path = template.path;
    let count = 1;
    while (files.some((f) => f.path === path)) {
      const dot = template.path.lastIndexOf(".");
      path = `${template.path.slice(0, dot)}-${count++}${template.path.slice(dot)}`;
    }
    setFiles((prev) => [...prev, { path, content: template.content }]);
    setActivePath(path);
    setShowTemplates(false);
    showToast(`Added ${path}`);
  };

  const addGenerated = (file: GeneratedFile) => {
    let path = file.path;
    let count = 1;
    while (files.some((f) => f.path === path)) {
      const dot = file.path.lastIndexOf(".");
      path = `${file.path.slice(0, dot)}-${count++}${file.path.slice(dot)}`;
    }
    setFiles((prev) => [...prev, { path, content: file.content }]);
    setActivePath(path);
    showToast(`Added ${path} to your pack`);
  };

  const addCustomFile = () => {
    const raw = window.prompt("File path (e.g. functions/my_function.mcfunction)");
    if (!raw) return;
    const path = raw.trim().replace(/\\/g, "/").replace(/^\/+/, "");
    if (!path) return;
    if (files.some((f) => f.path === path)) { showToast("A file with that path already exists.", "error"); return; }
    const content = path.endsWith(".json") ? "{\n  \n}\n" : "# New file\n";
    setFiles((prev) => [...prev, { path, content }]);
    setActivePath(path);
    showToast(`Created ${path}`);
  };

  const commitRename = (oldPath: string) => {
    const next = renameValue.trim().replace(/\\/g, "/").replace(/^\/+/, "");
    setRenaming(null);
    if (!next || next === oldPath) return;
    if (files.some((f) => f.path === next)) { showToast("A file with that path already exists.", "error"); return; }
    setFiles((prev) => prev.map((f) => (f.path === oldPath ? { ...f, path: next } : f)));
    if (activePath === oldPath) setActivePath(next);
  };

  const deleteFile = (path: string) => {
    const remaining = files.filter((f) => f.path !== path);
    setFiles(remaining);
    if (activePath === path) setActivePath(remaining[0]?.path ?? "");
    showToast(`Deleted ${path}`);
  };

  const formatJson = () => {
    if (!activeFile || !activeFile.path.endsWith(".json")) return;
    try {
      updateActive(JSON.stringify(JSON.parse(activeFile.content), null, 2) + "\n");
      showToast("JSON formatted.");
    } catch (err) {
      showToast(`Cannot format: ${(err as Error).message}`, "error");
    }
  };

  const insertSnippet = (text: string) => {
    const el = textareaRef.current;
    if (!el || !activeFile) return;
    const start = el.selectionStart;
    const end = el.selectionEnd;
    const next = activeFile.content.slice(0, start) + text + activeFile.content.slice(end);
    updateActive(next);
    requestAnimationFrame(() => {
      el.focus();
      el.setSelectionRange(start + text.length, start + text.length);
    });
  };

  const exportPack = async () => {
    if (invalidFiles.length) {
      setActivePath(invalidFiles[0].path);
      showToast(`Fix invalid JSON in ${invalidFiles[0].path} before exporting.`, "error");
      return;
    }
    setBusy(true);
    try {
      const blob = await buildBehaviorPack(meta, files);
      const slug = meta.name.trim().toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "") || "behavior-pack";
      downloadBlob(blob, `${slug}.zip`);
      showToast(`Exported ${files.length} files as ${slug}.zip`);
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
          <div className="studio-title-icon behavior"><Hammer size={20} /></div>
          <div><h1>Behavior Pack Studio</h1><span>Change how the game plays</span></div>
        </div>
        <div className="studio-header-actions">
          <span className={`count-badge ${invalidFiles.length ? "warn" : ""}`}>
            {invalidFiles.length ? `${invalidFiles.length} invalid JSON` : `${files.length} files ready`}
          </span>
          <button className="primary-btn" disabled={busy} onClick={exportPack}>
            <Download size={17} /> {busy ? "Building..." : "Export .zip"}
          </button>
        </div>
      </header>

      <div className="mode-tabs">
        <button className={mode === "quick" ? "active" : ""} onClick={() => setMode("quick")}>
          <Sparkles size={16} /> Quick Build <small>no JSON needed</small>
        </button>
        <button className={mode === "editor" ? "active" : ""} onClick={() => setMode("editor")}>
          <Braces size={16} /> Code Editor <small>advanced</small>
        </button>
      </div>

      <div className="studio-body behavior-body">
        {/* File tree */}
        <aside className="panel files-panel">
          <div className="panel-heading"><span><FolderOpen size={16} /> Pack Files</span></div>
          <div className="file-tree">
            {folders.map(([folder, folderFiles]) => (
              <div key={folder} className="tree-folder">
                <div className="tree-folder-name"><FolderOpen size={14} /> {folder} <span>{folderFiles.length}</span></div>
                {folderFiles.map((file) => (
                  <div key={file.path} className={`tree-file ${activeFile?.path === file.path ? "active" : ""}`}>
                    {renaming === file.path ? (
                      <input
                        autoFocus
                        value={renameValue}
                        onChange={(e) => setRenameValue(e.target.value)}
                        onBlur={() => commitRename(file.path)}
                        onKeyDown={(e) => {
                          if (e.key === "Enter") commitRename(file.path);
                          if (e.key === "Escape") setRenaming(null);
                        }}
                        onClick={(e) => e.stopPropagation()}
                      />
                    ) : (
                      <>
                        <button className="tree-file-main" onClick={() => setActivePath(file.path)}>
                          {file.path.endsWith(".mcfunction") || file.path.endsWith(".txt")
                            ? <FileCode2 size={14} /> : <FileJson size={14} />}
                          <span>{file.path.split("/").pop()}</span>
                          {file.path.endsWith(".json") && (jsonError(file.content) ? <i className="file-error" /> : <i className="file-ok" />)}
                        </button>
                        <button className="tree-file-action" title="Rename" onClick={() => { setRenaming(file.path); setRenameValue(file.path); }}><Wand2 size={12} /></button>
                        <button className="tree-file-action danger" title="Delete" onClick={() => deleteFile(file.path)}><Trash2 size={12} /></button>
                      </>
                    )}
                  </div>
                ))}
              </div>
            ))}
          </div>
          <div className="files-footer">
            <button className="wide-ghost-btn" onClick={() => setShowTemplates((v) => !v)}>
              <Plus size={15} /> Add from template
            </button>
            <button className="wide-ghost-btn" onClick={addCustomFile}><FilePlus2 size={15} /> New empty file</button>
          </div>
        </aside>

        {showTemplates && (
          <aside className="panel templates-panel">
            <div className="panel-heading">
              <span><Sparkles size={16} /> Templates</span>
              <button onClick={() => setShowTemplates(false)}><X size={15} /></button>
            </div>
            <div className="template-list">
              {BEHAVIOR_TEMPLATES.map((template) => (
                <button key={template.key} className="template-card" onClick={() => addTemplate(template)}>
                  <strong>{template.label}</strong>
                  <small>{template.description}</small>
                  <code>{template.path}</code>
                </button>
              ))}
            </div>
          </aside>
        )}

        {/* Quick builder or code editor */}
        <main className="panel code-panel">
          {mode === "quick" ? <BehaviorBuilder onAdd={addGenerated} /> : activeFile ? (
            <>
              <div className="code-header">
                <div>
                  <span className="eyebrow"><Braces size={13} /> EDITING FILE</span>
                  <h2>{activeFile.path}</h2>
                </div>
                <div className="code-header-actions">
                  {activeFile.path.endsWith(".json") && (
                    <button className="ghost-btn" onClick={formatJson}><Code2 size={14} /> Format JSON</button>
                  )}
                  <span className={`validation-pill ${activeError ? "invalid" : "valid"}`}>
                    {activeError ? <><X size={13} /> Invalid</> : <><CheckCircle2 size={13} /> Valid</>}
                  </span>
                </div>
              </div>
              <CodeEditor value={activeFile.content} onChange={updateActive} textareaRef={textareaRef} />
              <div className={`code-status ${activeError ? "error" : ""}`}>
                {activeError ? activeError : activeFile.path.endsWith(".json") ? "JSON syntax OK" : "Text file — no JSON validation"}
                <span>{activeFile.content.split("\n").length} lines · {activeFile.content.length} characters</span>
              </div>
            </>
          ) : (
            <div className="empty-state">No files. Add a template to get started.</div>
          )}
        </main>

        {/* Pack settings */}
        <aside className="panel behavior-details">
          <div className="panel-heading"><span><Hammer size={16} /> Pack Details</span></div>
          <div className="detail-fields">
            <label>Pack name<input value={meta.name} onChange={(e) => setMetaField("name", e.target.value)} /></label>
            <label>Description<textarea rows={2} value={meta.description} onChange={(e) => setMetaField("description", e.target.value)} /></label>
            <div className="field-row">
              <label>Version<input value={meta.version} onChange={(e) => setMetaField("version", e.target.value)} /></label>
              <label>Min engine<input value={meta.minEngineVersion} onChange={(e) => setMetaField("minEngineVersion", e.target.value)} /></label>
            </div>
          </div>

          {mode === "editor" && (
            <>
              <div className="panel-heading sub"><span><Sparkles size={16} /> Quick Snippets</span></div>
              <div className="snippet-list">
                {SNIPPETS.map((snippet) => (
                  <button key={snippet.label} onClick={() => insertSnippet(snippet.text)} title={snippet.text}>
                    <Plus size={13} /> {snippet.label}
                  </button>
                ))}
              </div>
              <p className="snippet-note">Inserted at the cursor in the active file.</p>
            </>
          )}

          <div className="export-box">
            <button className="primary-btn wide" disabled={busy} onClick={exportPack}>
              <Download size={17} /> {busy ? "Building..." : "Download .zip"}
            </button>
            <button className="ghost-btn wide" onClick={() => {
              if (confirm("Reset all files and pack details to defaults?")) {
                setFiles(DEFAULT_BEHAVIOR_FILES.map((f) => ({ ...f })));
                setActivePath("entities/example_creature.json");
                setMeta((prev) => ({ ...prev, uuid: makeUuid(), moduleUuid: makeUuid() }));
              }
            }}><RotateCcw size={15} /> Reset to templates</button>
            <p className="export-note">
              The <code>manifest.json</code> and <code>pack_icon.png</code> are generated automatically from the
              pack details above.
            </p>
          </div>

          <div className="tip-box">
            <Check size={15} />
            <span>All .json files are validated before export. Custom entities need a matching resource pack for textures and models.</span>
          </div>
        </aside>
      </div>

      {toast && <div className={`toast ${toast.kind}`}>{toast.message}</div>}
    </div>
  );
}
