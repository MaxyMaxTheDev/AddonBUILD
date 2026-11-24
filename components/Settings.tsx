"use client";

import { useRef, useState } from "react";
import {
  Database, Download, HardDrive, Palette, RotateCcw, Settings2, Upload,
} from "lucide-react";
import { useApp } from "./AppProvider";
import { Field, SectionTitle, Segmented, Toggle } from "./ui";
import { DEFAULT_SETTINGS, removeStorage, useStorageSize } from "@/lib/store";
import { downloadBlob } from "@/lib/pack";

export default function Settings() {
  const {
    settings, setSettings, projects, setProjects, setActiveProjectId, activity, setActivity,
    favorites, setFavorites, recentTextures, setRecentTextures, showToast, log,
  } = useApp();
  const [confirmReset, setConfirmReset] = useState(false);
  const importRef = useRef<HTMLInputElement>(null);
  const storedSize = useStorageSize(projects.length);

  const patch = (next: Partial<typeof settings>) =>
    setSettings((prev) => ({ ...prev, ...next }));

  const backup = () => {
    const payload = {
      version: 2,
      exportedAt: new Date().toISOString(),
      projects,
      settings,
      activity,
      favorites,
      recentTextures,
    };
    downloadBlob(
      new Blob([JSON.stringify(payload, null, 2)], { type: "application/json" }),
      `addonbuild-workspace-${new Date().toISOString().slice(0, 10)}.json`,
    );
    log("Exported workspace backup", "export");
    showToast("Workspace backup downloaded");
  };

  const restore = async (file?: File) => {
    if (!file) return;
    try {
      const data = JSON.parse(await file.text());
      if (!Array.isArray(data.projects)) throw new Error("Missing projects list");
      setProjects(data.projects);
      if (data.settings) setSettings({ ...DEFAULT_SETTINGS, ...data.settings });
      if (data.activity) setActivity(data.activity);
      if (data.favorites) setFavorites(data.favorites);
      if (data.recentTextures) setRecentTextures(data.recentTextures);
      setActiveProjectId(null);
      log("Restored workspace backup", "import");
      showToast("Workspace restored");
    } catch (err) {
      showToast(`Could not restore that file: ${(err as Error).message}`, "error");
    }
  };

  const reset = () => {
    removeStorage("addonbuild.");
    setProjects([]);
    setActiveProjectId(null);
    setSettings(DEFAULT_SETTINGS);
    setActivity([]);
    setFavorites([]);
    setRecentTextures([]);
    setConfirmReset(false);
    showToast("Workspace reset to defaults", "info");
  };

  return (
    <div className="page-wrap settings-page">
      <SectionTitle
        eyebrow="WORKSPACE"
        title="Settings"
        action={<span className="page-chip"><Settings2 size={14} /> Preferences</span>}
      />

      <div className="settings-grid">
        <section className="settings-card">
          <div className="settings-card-head"><Palette size={18} /><h3>Appearance</h3></div>
          <div className="settings-card-body">
            <Field label="Theme" hint="System follows your device setting.">
              <Segmented
                value={settings.theme}
                onChange={(theme) => patch({ theme })}
                options={[
                  { value: "dark", label: "Dark" },
                  { value: "light", label: "Light" },
                  { value: "system", label: "System" },
                ]}
              />
            </Field>
            <Field label="Accent color">
              <div className="accent-picker">
                {(["green", "blue", "purple", "orange"] as const).map((accent) => (
                  <button
                    key={accent}
                    className={`accent-dot ${accent} ${settings.accent === accent ? "active" : ""}`}
                    onClick={() => patch({ accent })}
                    aria-label={`${accent} accent`}
                  />
                ))}
              </div>
            </Field>
            <Toggle
              checked={settings.compact}
              onChange={(compact) => patch({ compact })}
              label="Compact mode"
              description="Tighter spacing and smaller panels."
            />
            <Toggle
              checked={settings.showGrid}
              onChange={(showGrid) => patch({ showGrid })}
              label="Pixel grid"
              description="Show grid lines while editing textures."
            />
          </div>
        </section>

        <section className="settings-card">
          <div className="settings-card-head"><Database size={18} /><h3>New pack defaults</h3></div>
          <div className="settings-card-body">
            <Field label="Description">
              <input
                value={settings.defaultDescription}
                onChange={(e) => patch({ defaultDescription: e.target.value })}
              />
            </Field>
            <div className="form-row-v2">
              <Field label="Version">
                <input value={settings.defaultVersion} onChange={(e) => patch({ defaultVersion: e.target.value })} />
              </Field>
              <Field label="Min engine">
                <input value={settings.defaultEngine} onChange={(e) => patch({ defaultEngine: e.target.value })} />
              </Field>
            </div>
            <Toggle
              checked={settings.autosave}
              onChange={(autosave) => patch({ autosave })}
              label="Autosave"
              description="Keep projects and editor progress in this browser."
            />
          </div>
        </section>

        <section className="settings-card">
          <div className="settings-card-head"><HardDrive size={18} /><h3>Workspace data</h3></div>
          <div className="settings-card-body">
            <div className="storage-meter">
              <div>
                <strong>{projects.length} projects</strong>
                <span>{storedSize} stored locally</span>
              </div>
              <div className="meter"><i style={{ width: `${Math.min(100, projects.length * 4)}%` }} /></div>
            </div>
            <div className="button-row">
              <button className="btn-v2 primary" onClick={backup}><Download size={15} /> Back up workspace</button>
              <button className="btn-v2" onClick={() => importRef.current?.click()}><Upload size={15} /> Restore backup</button>
              <input
                ref={importRef}
                type="file"
                accept="application/json"
                hidden
                onChange={(e) => { restore(e.target.files?.[0]); e.target.value = ""; }}
              />
            </div>
            <div className="danger-zone">
              <div>
                <strong>Reset everything</strong>
                <small>Deletes all projects, activity and preferences on this device.</small>
              </div>
              {confirmReset ? (
                <div className="button-row tight">
                  <button className="btn-v2 danger" onClick={reset}>Yes, reset</button>
                  <button className="btn-v2" onClick={() => setConfirmReset(false)}>Cancel</button>
                </div>
              ) : (
                <button className="btn-v2 danger-ghost" onClick={() => setConfirmReset(true)}>
                  <RotateCcw size={14} /> Reset
                </button>
              )}
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}
