"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import {
  Bell, BookOpen, Boxes, Check, ChevronRight, CircleHelp, Command,
  FolderKanban, Hammer, Image as ImageIcon, LayoutDashboard, Menu,
  Moon, Plus, Search, Settings2, Sparkles, Sun, X,
} from "lucide-react";
import { useApp } from "./AppProvider";
import CommandPalette from "./CommandPalette";
import Dashboard from "./Dashboard";
import Projects from "./Projects";
import Templates from "./Templates";
import Settings from "./Settings";
import Help from "./Help";
import ResourceStudio from "./ResourceStudio";
import BehaviorStudio from "./BehaviorStudio";
import { Field, Modal } from "./ui";
import { downloadBlob } from "@/lib/pack";
import { relativeTime, useStorageSize, type PackType, type View } from "@/lib/store";

const NAV: {
  group: string;
  items: { view: View; label: string; icon: typeof Search; hint?: string }[];
}[] = [
  {
    group: "Workspace",
    items: [
      { view: "dashboard", label: "Dashboard", icon: LayoutDashboard },
      { view: "projects", label: "Projects", icon: FolderKanban },
      { view: "templates", label: "Templates", icon: Sparkles },
    ],
  },
  {
    group: "Studios",
    items: [
      { view: "resource", label: "Resource Studio", icon: ImageIcon, hint: "2.0" },
      { view: "behavior", label: "Behavior Studio", icon: Hammer, hint: "2.0" },
    ],
  },
  {
    group: "System",
    items: [
      { view: "settings", label: "Settings", icon: Settings2 },
      { view: "help", label: "Help & shortcuts", icon: BookOpen },
    ],
  },
];

const VIEW_LABELS: Record<View, string> = {
  dashboard: "Dashboard",
  resource: "Resource Studio",
  behavior: "Behavior Studio",
  projects: "Projects",
  templates: "Templates",
  settings: "Settings",
  help: "Help & shortcuts",
};

export default function AppShell() {
  const {
    view, setView, navOpen, setNavOpen, paletteOpen, setPaletteOpen, settings, setSettings,
    projects, activity, toasts, dismissToast, createProject, openStudio, saveState, markSaved,
    showToast, favorites, recentTextures,
  } = useApp();
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const [creating, setCreating] = useState(false);
  const [newName, setNewName] = useState("");
  const [newType, setNewType] = useState<PackType>("resource");
  const storedSize = useStorageSize(projects.length);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const tag = (e.target as HTMLElement)?.tagName;
      const typing = tag === "INPUT" || tag === "TEXTAREA" || (e.target as HTMLElement)?.isContentEditable;
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setPaletteOpen(true);
      } else if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "s") {
        e.preventDefault();
        markSaved();
        showToast("Workspace saved", "ok");
      } else if (e.key === "?" && !typing) {
        e.preventDefault();
        setView("help");
      } else if (e.key === "Escape") {
        setNotificationsOpen(false);
        setNavOpen(false);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [markSaved, setNavOpen, setPaletteOpen, setView, showToast]);

  // Kept in a ref so the global backup listener always reads fresh context values.
  const snapshotRef = useRef({ projects, settings, activity, favorites, recentTextures });
  snapshotRef.current = { projects, settings, activity, favorites, recentTextures };

  useEffect(() => {
    const onBackup = () => {
      const snapshot = snapshotRef.current;
      downloadBlob(
        new Blob(
          [JSON.stringify({ version: 2, exportedAt: new Date().toISOString(), ...snapshot }, null, 2)],
          { type: "application/json" },
        ),
        `addonbuild-workspace-${new Date().toISOString().slice(0, 10)}.json`,
      );
    };
    window.addEventListener("addonbuild:backup", onBackup);
    return () => window.removeEventListener("addonbuild:backup", onBackup);
  }, []);

  const themeLabel = settings.theme === "dark" ? "Light mode" : "Dark mode";

  const content = useMemo(() => {
    switch (view) {
      case "resource": return <ResourceStudio onBack={() => setView("dashboard")} />;
      case "behavior": return <BehaviorStudio onBack={() => setView("dashboard")} />;
      case "projects": return <Projects />;
      case "templates": return <Templates />;
      case "settings": return <Settings />;
      case "help": return <Help />;
      default: return <Dashboard />;
    }
  }, [view, setView]);

  return (
    <div className="app-shell">
      {navOpen && <div className="nav-scrim" onClick={() => setNavOpen(false)} />}
      <aside className={`sidebar ${navOpen ? "open" : ""}`}>
        <div className="sidebar-brand">
          <div className="logo-mark">A</div>
          <div className="brand-copy">
            <strong>AddonBUILD</strong>
            <span>VERSION 2.0</span>
          </div>
          <button className="icon-btn mobile-only" onClick={() => setNavOpen(false)}><X size={17} /></button>
        </div>

        <button className="sidebar-new" onClick={() => setCreating(true)}>
          <Plus size={16} /> New project
        </button>

        <nav className="sidebar-nav">
          {NAV.map((group) => (
            <div key={group.group} className="nav-group">
              <span className="nav-group-label">{group.group}</span>
              {group.items.map((item) => {
                const Icon = item.icon;
                return (
                  <button
                    key={item.view}
                    className={`nav-item ${view === item.view ? "active" : ""}`}
                    onClick={() => {
                      if (item.view === "resource" || item.view === "behavior") openStudio(item.view);
                      else setView(item.view);
                      setNavOpen(false);
                    }}
                  >
                    <Icon size={17} />
                    <span>{item.label}</span>
                    {item.hint && <em>{item.hint}</em>}
                    {view === item.view && <span className="nav-active-dot" />}
                  </button>
                );
              })}
            </div>
          ))}
        </nav>

        <div className="sidebar-foot">
          <div className="sidebar-stat">
            <Boxes size={15} />
            <div><strong>{projects.length} projects</strong><small>{storedSize} stored</small></div>
          </div>
          <div className="sidebar-user">
            <span className="avatar">AB</span>
            <div><strong>Local workspace</strong><small>No account needed</small></div>
          </div>
        </div>
      </aside>

      <div className="app-main">
        <header className="topbar">
          <button className="icon-btn mobile-only" onClick={() => setNavOpen(true)}><Menu size={19} /></button>
          <div className="breadcrumb">
            <span>AddonBUILD</span>
            <ChevronRight size={14} />
            <strong>{VIEW_LABELS[view]}</strong>
          </div>
          <button className="topbar-search" onClick={() => setPaletteOpen(true)}>
            <Search size={16} />
            <span>Search anything…</span>
            <kbd><Command size={11} /> K</kbd>
          </button>
          <div className="topbar-right">
            <span className={`save-status ${saveState}`}>
              {saveState === "saved" ? <Check size={13} /> : <span className="save-dot" />}
              {saveState === "saving" ? "Saving…" : saveState === "saved" ? "Saved" : "Autosave"}
            </span>
            <button
              className="icon-btn"
              title={themeLabel}
              onClick={() => setSettings((prev) => ({ ...prev, theme: prev.theme === "dark" ? "light" : "dark" }))}
            >
              {settings.theme === "dark" ? <Sun size={17} /> : <Moon size={17} />}
            </button>
            <div className="notification-wrap">
              <button className="icon-btn" title="Activity" onClick={() => setNotificationsOpen((v) => !v)}>
                <Bell size={17} />
                {activity.length > 0 && <i className="notification-dot" />}
              </button>
              {notificationsOpen && (
                <div className="notification-panel">
                  <div className="notification-head"><strong>Recent activity</strong><button onClick={() => setNotificationsOpen(false)}><X size={14} /></button></div>
                  {activity.slice(0, 5).map((item) => (
                    <div key={item.id} className="notification-row">
                      <span className={`activity-dot ${item.kind}`} />
                      <div><strong>{item.text}</strong><small>{relativeTime(item.at)}</small></div>
                    </div>
                  ))}
                  {!activity.length && <p className="notification-empty">Nothing yet — your edits will appear here.</p>}
                  <button className="notification-foot" onClick={() => { setView("dashboard"); setNotificationsOpen(false); }}>Open dashboard</button>
                </div>
              )}
            </div>
            <button className="btn-v2 primary small topbar-new" onClick={() => setCreating(true)}>
              <Plus size={15} /> New
            </button>
          </div>
        </header>

        <main className="app-content">{content}</main>
      </div>

      <CommandPalette />
      <div className="toast-host">
        {toasts.map((toast) => (
          <div key={toast.id} className={`toast-v2 ${toast.kind}`}>
            <span className="toast-icon">
              {toast.kind === "error" ? <CircleHelp size={16} /> : toast.kind === "info" ? <Bell size={16} /> : <Check size={16} />}
            </span>
            <span>{toast.message}</span>
            <button onClick={() => dismissToast(toast.id)}><X size={14} /></button>
          </div>
        ))}
      </div>

      <Modal
        open={creating}
        onClose={() => setCreating(false)}
        title="Create a new project"
        subtitle="You can rename and reconfigure it later."
        footer={<><button className="btn-v2" onClick={() => setCreating(false)}>Cancel</button><button className="btn-v2 primary" onClick={() => { createProject(newName, newType); setCreating(false); setNewName(""); }}><Plus size={15} /> Create project</button></>}
      >
        <div className="modal-fields">
          <Field label="Pack type">
            <div className="segmented-v2">
              <button className={newType === "resource" ? "active" : ""} onClick={() => setNewType("resource")}><ImageIcon size={14} /> Resource</button>
              <button className={newType === "behavior" ? "active" : ""} onClick={() => setNewType("behavior")}><Hammer size={14} /> Behavior</button>
            </div>
          </Field>
          <Field label="Project name">
            <input autoFocus value={newName} onChange={(e) => setNewName(e.target.value)} placeholder="My awesome pack" />
          </Field>
        </div>
      </Modal>
    </div>
  );
}
