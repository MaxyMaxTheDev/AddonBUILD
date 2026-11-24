"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import {
  ArrowRight, BookOpen, Boxes, FileJson, FolderKanban, Hammer, Image as ImageIcon,
  LayoutDashboard, Moon, Search, Settings2, Sparkles, Sun,
} from "lucide-react";
import { useApp } from "./AppProvider";
import type { View } from "@/lib/store";

interface Command {
  id: string;
  label: string;
  hint: string;
  icon: typeof Search;
  run: () => void;
}

export default function CommandPalette() {
  const {
    paletteOpen, setPaletteOpen, setView, projects, openProject, openStudio, settings, setSettings,
    createProject, showToast,
  } = useApp();
  const [query, setQuery] = useState("");
  const [index, setIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);

  const commands = useMemo<Command[]>(() => {
    const nav: { view: View; label: string; hint: string; icon: typeof Search }[] = [
      { view: "dashboard", label: "Go to Dashboard", hint: "Overview and quick actions", icon: LayoutDashboard },
      { view: "resource", label: "Open Resource Studio", hint: "Edit real Minecraft textures", icon: ImageIcon },
      { view: "behavior", label: "Open Behavior Studio", hint: "Build gameplay with simple forms", icon: Hammer },
      { view: "projects", label: "Go to Projects", hint: "Manage your saved packs", icon: FolderKanban },
      { view: "templates", label: "Browse Templates", hint: "Start from a ready-made idea", icon: Sparkles },
      { view: "settings", label: "Open Settings", hint: "Theme, defaults and workspace data", icon: Settings2 },
      { view: "help", label: "Open Help & Shortcuts", hint: "Docs, FAQ and changelog", icon: BookOpen },
    ];
    const base: Command[] = nav.map((item) => ({
      id: `nav-${item.view}`,
      label: item.label,
      hint: item.hint,
      icon: item.icon,
      run: () => {
        if (item.view === "resource" || item.view === "behavior") openStudio(item.view);
        else setView(item.view);
        setPaletteOpen(false);
      },
    }));
    const projectCommands: Command[] = projects.slice(0, 8).map((project) => ({
      id: `project-${project.id}`,
      label: `Open ${project.name}`,
      hint: `${project.type === "resource" ? "Resource" : "Behavior"} pack · ${project.type === "resource" ? "textures" : "files"}`,
      icon: project.type === "resource" ? ImageIcon : Boxes,
      run: () => {
        openProject(project.id);
        setPaletteOpen(false);
      },
    }));
    const actions: Command[] = [
      {
        id: "new-resource",
        label: "New resource pack",
        hint: "Create a blank resource project",
        icon: ImageIcon,
        run: () => {
          createProject("New Resource Pack", "resource");
          setPaletteOpen(false);
        },
      },
      {
        id: "new-behavior",
        label: "New behavior pack",
        hint: "Create a blank behavior project",
        icon: FileJson,
        run: () => {
          createProject("New Behavior Pack", "behavior");
          setPaletteOpen(false);
        },
      },
      {
        id: "toggle-theme",
        label: settings.theme === "dark" ? "Switch to light theme" : "Switch to dark theme",
        hint: "Toggle the appearance",
        icon: settings.theme === "dark" ? Sun : Moon,
        run: () => {
          setSettings((prev) => ({ ...prev, theme: prev.theme === "dark" ? "light" : "dark" }));
          setPaletteOpen(false);
        },
      },
      {
        id: "backup",
        label: "Export workspace backup",
        hint: "Download all projects as JSON",
        icon: FolderKanban,
        run: () => {
          window.dispatchEvent(new CustomEvent("addonbuild:backup"));
          setPaletteOpen(false);
          showToast("Opening backup options…", "info");
        },
      },
    ];
    return [...base, ...projectCommands, ...actions];
  }, [createProject, openProject, openStudio, projects, setPaletteOpen, setSettings, setView, settings.theme, showToast]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return commands;
    return commands.filter(
      (command) =>
        command.label.toLowerCase().includes(q) || command.hint.toLowerCase().includes(q),
    );
  }, [commands, query]);

  useEffect(() => {
    if (!paletteOpen) return;
    setQuery("");
    setIndex(0);
    requestAnimationFrame(() => inputRef.current?.focus());
  }, [paletteOpen]);

  useEffect(() => setIndex(0), [query]);

  if (!paletteOpen) return null;

  const run = (command: Command) => command.run();

  return (
    <div className="modal-backdrop palette-backdrop" onMouseDown={() => setPaletteOpen(false)}>
      <div className="palette-card" onMouseDown={(e) => e.stopPropagation()}>
        <div className="palette-input">
          <Search size={18} />
          <input
            ref={inputRef}
            value={query}
            placeholder="Search pages, projects and actions…"
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "ArrowDown") {
                e.preventDefault();
                setIndex((i) => Math.min(i + 1, filtered.length - 1));
              } else if (e.key === "ArrowUp") {
                e.preventDefault();
                setIndex((i) => Math.max(i - 1, 0));
              } else if (e.key === "Enter" && filtered[index]) {
                e.preventDefault();
                run(filtered[index]);
              } else if (e.key === "Escape") {
                setPaletteOpen(false);
              }
            }}
          />
          <kbd>ESC</kbd>
        </div>
        <div className="palette-results">
          {filtered.length === 0 && (
            <div className="palette-empty">No matches. Try “resource”, “projects” or a pack name.</div>
          )}
          {filtered.map((command, i) => {
            const Icon = command.icon;
            return (
              <button
                key={command.id}
                className={`palette-item ${i === index ? "active" : ""}`}
                onMouseEnter={() => setIndex(i)}
                onClick={() => run(command)}
              >
                <span className="palette-icon"><Icon size={16} /></span>
                <span className="palette-text">
                  <strong>{command.label}</strong>
                  <small>{command.hint}</small>
                </span>
                <ArrowRight size={15} />
              </button>
            );
          })}
        </div>
        <div className="palette-foot">
          <span><kbd>↑</kbd><kbd>↓</kbd> navigate</span>
          <span><kbd>↵</kbd> select</span>
          <span><kbd>ESC</kbd> close</span>
        </div>
      </div>
    </div>
  );
}
