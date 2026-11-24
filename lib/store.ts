"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { PackMeta } from "./pack";

export type PackType = "resource" | "behavior";

export type View =
  | "dashboard"
  | "resource"
  | "behavior"
  | "projects"
  | "templates"
  | "settings"
  | "help";

export interface Project {
  id: string;
  name: string;
  type: PackType;
  description: string;
  createdAt: number;
  updatedAt: number;
  favorite: boolean;
  meta: PackMeta;
}

export interface WorkspaceSettings {
  theme: "dark" | "light" | "system";
  accent: "green" | "blue" | "purple" | "orange";
  compact: boolean;
  autosave: boolean;
  showGrid: boolean;
  defaultDescription: string;
  defaultVersion: string;
  defaultEngine: string;
}

export interface ActivityItem {
  id: string;
  at: number;
  text: string;
  kind: "create" | "edit" | "export" | "import" | "delete" | "system";
}

export const DEFAULT_SETTINGS: WorkspaceSettings = {
  theme: "dark",
  accent: "green",
  compact: false,
  autosave: true,
  showGrid: true,
  defaultDescription: "Created with AddonBUILD 2.0",
  defaultVersion: "1.0.0",
  defaultEngine: "1.20.0",
};

export const STORAGE_KEYS = {
  projects: "addonbuild.projects.v2",
  activeProject: "addonbuild.activeProject.v2",
  settings: "addonbuild.settings.v2",
  activity: "addonbuild.activity.v2",
  favorites: "addonbuild.favorites.v2",
  recentTextures: "addonbuild.recentTextures.v2",
  projectData: (id: string, kind: string) => `addonbuild.project.${id}.${kind}.v2`,
} as const;

export function uid(): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) return crypto.randomUUID();
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
}

export function readStorage<T>(key: string, fallback: T): T {
  if (typeof window === "undefined") return fallback;
  try {
    const raw = window.localStorage.getItem(key);
    return raw === null ? fallback : (JSON.parse(raw) as T);
  } catch {
    return fallback;
  }
}

export function writeStorage<T>(key: string, value: T): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(key, JSON.stringify(value));
  } catch {
    // Storage can be full or blocked — the app keeps working in memory.
  }
}

export function removeStorage(prefix: string): void {
  if (typeof window === "undefined") return;
  for (const key of localStorageKeys(prefix)) window.localStorage.removeItem(key);
}

export function localStorageKeys(prefix: string): string[] {
  if (typeof window === "undefined") return [];
  const keys: string[] = [];
  for (let i = 0; i < window.localStorage.length; i++) {
    const key = window.localStorage.key(i);
    if (key?.startsWith(prefix)) keys.push(key);
  }
  return keys;
}

/** State that hydrates from localStorage after mount, then writes through automatically. */
export function usePersistentState<T>(key: string, fallback: T) {
  const [value, setValue] = useState<T>(fallback);
  const [loaded, setLoaded] = useState(false);
  const fallbackRef = useRef(fallback);
  fallbackRef.current = fallback;

  useEffect(() => {
    try {
      const raw = window.localStorage.getItem(key);
      setValue(raw === null ? fallbackRef.current : (JSON.parse(raw) as T));
    } catch {
      setValue(fallbackRef.current);
    }
    setLoaded(true);
  }, [key]);

  useEffect(() => {
    if (!loaded) return;
    try {
      window.localStorage.setItem(key, JSON.stringify(value));
    } catch {
      // ignore quota / privacy-mode errors
    }
  }, [key, value, loaded]);

  const reset = useCallback(() => setValue(fallbackRef.current), []);

  return { value, setValue, loaded, reset } as const;
}

export function makeProject(
  name: string,
  type: PackType,
  settings: WorkspaceSettings,
  description?: string,
): Project {
  const now = Date.now();
  const moduleUuid = uid();
  return {
    id: uid(),
    name: name.trim() || (type === "resource" ? "Untitled Resource Pack" : "Untitled Behavior Pack"),
    type,
    description: description?.trim() || settings.defaultDescription,
    createdAt: now,
    updatedAt: now,
    favorite: false,
    meta: {
      name: name.trim() || (type === "resource" ? "Untitled Resource Pack" : "Untitled Behavior Pack"),
      description: description?.trim() || settings.defaultDescription,
      version: settings.defaultVersion,
      minEngineVersion: settings.defaultEngine,
      uuid: uid(),
      moduleUuid,
    },
  };
}

export function relativeTime(at: number): string {
  const seconds = Math.max(1, Math.floor((Date.now() - at) / 1000));
  if (seconds < 60) return "just now";
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 30) return `${days}d ago`;
  return new Date(at).toLocaleDateString();
}

export function slug(value: string): string {
  return (
    value
      .trim()
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "") || "addon"
  );
}

export function storageSize(): string {
  if (typeof window === "undefined") return "0 KB";
  let total = 0;
  for (let i = 0; i < window.localStorage.length; i++) {
    const key = window.localStorage.key(i);
    if (key?.startsWith("addonbuild.")) total += (window.localStorage.getItem(key)?.length ?? 0) * 2;
  }
  return total > 1024 * 1024
    ? `${(total / 1024 / 1024).toFixed(1)} MB`
    : `${Math.max(1, Math.round(total / 1024))} KB`;
}

/** Reads storage only after mount so SSR and the first client render agree. */
export function useStorageSize(refreshKey?: unknown): string {
  const [size, setSize] = useState("0 KB");
  useEffect(() => setSize(storageSize()), [refreshKey]);
  return size;
}
