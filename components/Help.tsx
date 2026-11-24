"use client";

import {
  BookOpen, CircleHelp, Download, FileJson, Image as ImageIcon, Keyboard,
  MousePointer2, Sparkles, Wand2,
} from "lucide-react";
import { SectionTitle } from "./ui";
import { CATEGORIES, TEXTURE_CATALOG } from "@/lib/textures";

const SHORTCUTS = [
  ["Ctrl / ⌘ + K", "Open command palette"],
  ["Ctrl / ⌘ + S", "Mark workspace saved"],
  ["?", "Open this help page"],
  ["Esc", "Close dialogs and palettes"],
  ["B / E / G / I", "Pencil / Eraser / Fill / Eyedropper"],
  ["L / R", "Line / Rectangle"],
  ["H", "Toggle pixel grid"],
  ["+ / −", "Zoom in / out"],
  ["Ctrl / ⌘ + Z", "Undo texture edit"],
  ["Ctrl / ⌘ + Y", "Redo texture edit"],
];

const FAQ = [
  {
    q: "Are Mojang textures included?",
    a: "No files are redistributed. AddonBUILD loads the real vanilla PNGs directly from Mojang's public bedrock-samples repository when you browse or edit them.",
  },
  {
    q: "Where are my projects saved?",
    a: "In this browser's local storage. Use Settings → Back up workspace to download a portable JSON backup.",
  },
  {
    q: "Can I use these packs on Java Edition?",
    a: "No. This tool targets Minecraft Bedrock Edition, which uses behavior packs and resource packs with manifest.json.",
  },
  {
    q: "Do custom items need a resource pack?",
    a: "Yes. Behavior packs define how items work; their icons and models come from a resource pack.",
  },
];

export default function Help() {
  return (
    <div className="page-wrap help-page">
      <SectionTitle
        eyebrow="SUPPORT"
        title="Help & shortcuts"
        action={<span className="page-chip"><BookOpen size={14} /> Guides</span>}
      />

      <div className="help-hero">
        <div>
          <span className="eyebrow-v2">WELCOME TO 2.0</span>
          <h2>Everything you need to build a Bedrock add-on.</h2>
          <p>
            Start from a template, paint real textures, generate behaviors with forms, then export an
            installable .zip or .mcpack. No installs, no accounts.
          </p>
        </div>
        <div className="help-hero-stat">
          <strong>{TEXTURE_CATALOG.length.toLocaleString()}</strong>
          <span>real textures · {CATEGORIES.length} folders</span>
        </div>
      </div>

      <div className="help-grid">
        <section className="help-card">
          <h3><MousePointer2 size={17} /> Quick start</h3>
          <ol className="help-steps">
            <li><span>1</span><div><strong>Create a project</strong><small>Dashboard → New project, or pick a template.</small></div></li>
            <li><span>2</span><div><strong>Make it yours</strong><small>Paint textures or fill in behavior forms.</small></div></li>
            <li><span>3</span><div><strong>Export & install</strong><small>Download the pack and activate it in a world.</small></div></li>
          </ol>
        </section>

        <section className="help-card">
          <h3><Keyboard size={17} /> Keyboard shortcuts</h3>
          <div className="shortcut-list">
            {SHORTCUTS.map(([keys, label]) => (
              <div key={keys}><span>{label}</span><kbd>{keys}</kbd></div>
            ))}
          </div>
        </section>

        <section className="help-card">
          <h3><CircleHelp size={17} /> Frequently asked</h3>
          <div className="faq-list">
            {FAQ.map((item) => (
              <details key={item.q}>
                <summary>{item.q}</summary>
                <p>{item.a}</p>
              </details>
            ))}
          </div>
        </section>

        <section className="help-card">
          <h3><Sparkles size={17} /> What&apos;s new in 2.0</h3>
          <ul className="changelog">
            <li><Wand2 size={14} /> Complete app-shell redesign with sidebar, command palette and themes</li>
            <li><FolderIcon /> Saved projects with autosave, duplicate and workspace backup</li>
            <li><ImageIcon size={14} /> Favorites, recents, grid view and original-vs-edit comparison</li>
            <li><FileJson size={14} /> Expanded Quick Build with blocks, animations and spawn rules</li>
            <li><Download size={14} /> .zip / .mcpack export from a unified export dialog</li>
          </ul>
        </section>
      </div>

      <p className="help-foot">
        AddonBUILD is a fan-made tool, not affiliated with Mojang or Microsoft. Minecraft is a
        trademark of Mojang AB. Assets are subject to the Minecraft EULA.
      </p>
    </div>
  );
}

function FolderIcon() {
  return <span className="changelog-icon">▣</span>;
}
