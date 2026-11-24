"use client";

import {
  createContext, useCallback, useContext, useEffect, useMemo, useRef, useState,
  type Dispatch, type ReactNode, type SetStateAction,
} from "react";
import {
  DEFAULT_SETTINGS, STORAGE_KEYS, localStorageKeys, makeProject, relativeTime, removeStorage, uid,
  usePersistentState, type ActivityItem, type PackType, type Project,
  type View, type WorkspaceSettings,
} from "@/lib/store";
import type { PackMeta } from "@/lib/pack";

export interface Toast {
  id: string;
  message: string;
  kind: "ok" | "error" | "info";
}

interface AppContextValue {
  view: View;
  setView: Dispatch<SetStateAction<View>>;
  projects: Project[];
  setProjects: Dispatch<SetStateAction<Project[]>>;
  activeProjectId: string | null;
  setActiveProjectId: Dispatch<SetStateAction<string | null>>;
  activeProject: Project | null;
  settings: WorkspaceSettings;
  setSettings: Dispatch<SetStateAction<WorkspaceSettings>>;
  activity: ActivityItem[];
  setActivity: Dispatch<SetStateAction<ActivityItem[]>>;
  favorites: string[];
  setFavorites: Dispatch<SetStateAction<string[]>>;
  recentTextures: string[];
  setRecentTextures: Dispatch<SetStateAction<string[]>>;
  toasts: Toast[];
  showToast: (message: string, kind?: Toast["kind"]) => void;
  dismissToast: (id: string) => void;
  log: (text: string, kind?: ActivityItem["kind"]) => void;
  openProject: (id: string, view?: View) => void;
  openStudio: (type: PackType) => void;
  createProject: (name: string, type: PackType, description?: string) => Project;
  updateProject: (id: string, patch: Partial<Project>) => void;
  deleteProject: (id: string) => void;
  duplicateProject: (id: string) => Project | null;
  paletteOpen: boolean;
  setPaletteOpen: Dispatch<SetStateAction<boolean>>;
  navOpen: boolean;
  setNavOpen: Dispatch<SetStateAction<boolean>>;
  saveState: "idle" | "saving" | "saved";
  markSaved: () => void;
  loaded: boolean;
}

const AppContext = createContext<AppContextValue | null>(null);

function applyTheme(settings: WorkspaceSettings) {
  if (typeof document === "undefined") return;
  const dark =
    settings.theme === "dark" ||
    (settings.theme === "system" &&
      window.matchMedia("(prefers-color-scheme: dark)").matches);
  document.documentElement.dataset.theme = dark ? "dark" : "light";
  document.documentElement.dataset.accent = settings.accent;
  document.documentElement.dataset.compact = settings.compact ? "true" : "false";
}

export function AppProvider({ children }: { children: ReactNode }) {
  const projectsState = usePersistentState<Project[]>(STORAGE_KEYS.projects, []);
  const activeProjectState = usePersistentState<string | null>(STORAGE_KEYS.activeProject, null);
  const settingsState = usePersistentState<WorkspaceSettings>(STORAGE_KEYS.settings, DEFAULT_SETTINGS);
  const activityState = usePersistentState<ActivityItem[]>(STORAGE_KEYS.activity, []);
  const favoritesState = usePersistentState<string[]>(STORAGE_KEYS.favorites, []);
  const recentState = usePersistentState<string[]>(STORAGE_KEYS.recentTextures, []);

  const [view, setView] = useState<View>("dashboard");
  const [toasts, setToasts] = useState<Toast[]>([]);
  const [paletteOpen, setPaletteOpen] = useState(false);
  const [navOpen, setNavOpen] = useState(false);
  const [saveState, setSaveState] = useState<"idle" | "saving" | "saved">("idle");
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => applyTheme(settingsState.value), [settingsState.value]);

  useEffect(() => {
    const media = window.matchMedia("(prefers-color-scheme: dark)");
    const onChange = () => {
      if (settingsState.value.theme === "system") applyTheme(settingsState.value);
    };
    media.addEventListener("change", onChange);
    return () => media.removeEventListener("change", onChange);
  }, [settingsState.value]);

  const dismissToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const showToast = useCallback(
    (message: string, kind: Toast["kind"] = "ok") => {
      const id = uid();
      setToasts((prev) => [...prev.slice(-3), { id, message, kind }]);
      setTimeout(() => dismissToast(id), 4200);
    },
    [dismissToast],
  );

  const log = useCallback(
    (text: string, kind: ActivityItem["kind"] = "system") => {
      activityState.setValue((prev) =>
        [{ id: uid(), at: Date.now(), text, kind }, ...prev].slice(0, 60),
      );
    },
    [activityState],
  );

  const markSaved = useCallback(() => {
    setSaveState("saving");
    if (saveTimer.current) clearTimeout(saveTimer.current);
    saveTimer.current = setTimeout(() => setSaveState("saved"), 600);
  }, []);

  const activeProject = useMemo(
    () => projectsState.value.find((p) => p.id === activeProjectState.value) ?? null,
    [projectsState.value, activeProjectState.value],
  );

  const openProject = useCallback(
    (id: string, nextView?: View) => {
      const project = projectsState.value.find((p) => p.id === id);
      if (!project) return;
      activeProjectState.setValue(id);
      setView(nextView ?? (project.type === "resource" ? "resource" : "behavior"));
      setNavOpen(false);
      log(`Opened ${project.name}`, "system");
    },
    [activeProjectState, projectsState.value, log],
  );

  const createProject = useCallback(
    (name: string, type: PackType, description?: string) => {
      const project = makeProject(name, type, settingsState.value, description);
      projectsState.setValue((prev) => [project, ...prev]);
      activeProjectState.setValue(project.id);
      setView(type === "resource" ? "resource" : "behavior");
      log(`Created ${project.name}`, "create");
      showToast(`${project.name} created`);
      return project;
    },
    [activeProjectState, log, projectsState, settingsState.value, showToast],
  );

  const openStudio = useCallback(
    (type: PackType) => {
      const target: View = type === "resource" ? "resource" : "behavior";
      if (activeProject?.type === type) {
        setView(target);
        setNavOpen(false);
        return;
      }
      const candidate = projectsState.value
        .filter((project) => project.type === type)
        .sort((a, b) => b.updatedAt - a.updatedAt)[0];
      if (candidate) {
        openProject(candidate.id, target);
        return;
      }
      createProject(
        type === "resource" ? "My Resource Pack" : "My Behavior Pack",
        type,
      );
    },
    [activeProject, createProject, openProject, projectsState.value],
  );

  const updateProject = useCallback(
    (id: string, patch: Partial<Project>) => {
      projectsState.setValue((prev) =>
        prev.map((p) =>
          p.id === id
            ? {
                ...p,
                ...patch,
                updatedAt: Date.now(),
                meta: patch.meta ?? p.meta,
              }
            : p,
        ),
      );
      markSaved();
    },
    [projectsState, markSaved],
  );

  const deleteProject = useCallback(
    (id: string) => {
      const project = projectsState.value.find((p) => p.id === id);
      projectsState.setValue((prev) => prev.filter((p) => p.id !== id));
      if (activeProjectState.value === id) activeProjectState.setValue(null);
      removeStorage(`addonbuild.project.${id}.`);
      if (project) log(`Deleted ${project.name}`, "delete");
      showToast(project ? `${project.name} deleted` : "Project deleted", "info");
    },
    [activeProjectState, log, projectsState, showToast],
  );

  const duplicateProject = useCallback(
    (id: string) => {
      const source = projectsState.value.find((p) => p.id === id);
      if (!source) return null;
      const now = Date.now();
      const copy: Project = {
        ...source,
        id: uid(),
        name: `${source.name} copy`,
        createdAt: now,
        updatedAt: now,
        favorite: false,
        meta: { ...source.meta, uuid: uid(), moduleUuid: uid(), name: `${source.name} copy` },
      };
      projectsState.setValue((prev) => [copy, ...prev]);
      for (const key of localStorageKeys(`addonbuild.project.${id}.`)) {
        const data = window.localStorage.getItem(key);
        if (data) window.localStorage.setItem(key.replace(`.${id}.`, `.${copy.id}.`), data);
      }
      log(`Duplicated ${source.name}`, "create");
      showToast(`${source.name} duplicated`);
      return copy;
    },
    [log, projectsState, showToast],
  );

  const value: AppContextValue = {
    view,
    setView,
    projects: projectsState.value,
    setProjects: projectsState.setValue,
    activeProjectId: activeProjectState.value,
    setActiveProjectId: activeProjectState.setValue,
    activeProject,
    settings: settingsState.value,
    setSettings: settingsState.setValue,
    activity: activityState.value,
    setActivity: activityState.setValue,
    favorites: favoritesState.value,
    setFavorites: favoritesState.setValue,
    recentTextures: recentState.value,
    setRecentTextures: recentState.setValue,
    toasts,
    showToast,
    dismissToast,
    log,
    openProject,
    openStudio,
    createProject,
    updateProject,
    deleteProject,
    duplicateProject,
    paletteOpen,
    setPaletteOpen,
    navOpen,
    setNavOpen,
    saveState,
    markSaved,
    loaded:
      projectsState.loaded &&
      activeProjectState.loaded &&
      settingsState.loaded &&
      activityState.loaded &&
      favoritesState.loaded &&
      recentState.loaded,
  };

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
}

export function useApp(): AppContextValue {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error("useApp must be used inside AppProvider");
  return ctx;
}

export function useProjectMeta(): {
  meta: PackMeta | null;
  setMeta: (meta: PackMeta) => void;
} {
  const { activeProject, updateProject } = useApp();
  return {
    meta: activeProject?.meta ?? null,
    setMeta: (meta) => {
      if (activeProject) updateProject(activeProject.id, { meta, name: meta.name });
    },
  };
}

export { relativeTime };
