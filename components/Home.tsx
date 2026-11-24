"use client";

import {
  ArrowRight, Box, Check, Download, FileJson, Hammer, Image as ImageIcon,
  MousePointer2, Paintbrush, Sparkles, Wrench,
} from "lucide-react";
import type { Screen } from "./ModMaker";
import { CATEGORIES, TEXTURE_CATALOG } from "@/lib/textures";

export default function Home({ onSelect }: { onSelect: (screen: Screen) => void }) {
  return (
    <div className="home">
      <div className="home-grid-bg" />
      <header className="home-header">
        <div className="brand">
          <div className="brand-cube" aria-hidden="true"><span>B</span></div>
          <div>
            <div className="brand-name">BLOCKFORGE</div>
            <div className="brand-tag">MINECRAFT ADD-ON MAKER</div>
          </div>
        </div>
        <div className="home-header-right">
          <span className="badge-soft"><span className="dot-live" /> Runs in your browser</span>
          <span className="version-pill">Bedrock Edition</span>
        </div>
      </header>

      <main className="home-main">
        <section className="hero">
          <div className="hero-eyebrow"><Sparkles size={14} /> BUILD PACKS LIKE A PRO</div>
          <h1>Your Minecraft add-on,<br /><span>block by block.</span></h1>
          <p>
            Pick a pack type, edit the real in-game textures pixel by pixel or build behaviors with
            simple forms, then export a ready-to-install add-on. No installs, no accounts.
          </p>
        </section>

        <section className="pack-choices" aria-label="Choose a pack type">
          <button className="pack-card resource-card" onClick={() => onSelect("resource")}>
            <div className="pack-card-top">
              <div className="pack-icon"><Paintbrush size={30} strokeWidth={2.2} /></div>
              <span className="pack-type">01 / VISUALS</span>
            </div>
            <h2>Resource Pack</h2>
            <p>Change how the game looks. Browse every real vanilla texture, paint it, and export.</p>
            <div className="pack-stat">
              <ImageIcon size={15} /> {TEXTURE_CATALOG.length.toLocaleString()} real game textures across {CATEGORIES.length} folders
            </div>
            <ul className="feature-list">
              <li><Check size={14} /> Every texture from Mojang&apos;s bedrock-samples</li>
              <li><Check size={14} /> Pixel editor with brush, fill, undo and zoom</li>
              <li><Check size={14} /> Search by block, item, mob or texture path</li>
              <li><Check size={14} /> Exports manifest.json + pack_icon.png</li>
            </ul>
            <span className="card-cta">Open Resource Studio <ArrowRight size={17} /></span>
          </button>

          <button className="pack-card behavior-card" onClick={() => onSelect("behavior")}>
            <div className="pack-card-top">
              <div className="pack-icon"><Hammer size={30} strokeWidth={2.2} /></div>
              <span className="pack-type">02 / LOGIC</span>
            </div>
            <h2>Behavior Pack</h2>
            <p>Change how the game plays. Add custom entities, items, loot tables, recipes and commands.</p>
            <div className="pack-stat">
              <FileJson size={15} /> Creatures, items, loot, recipes & commands
            </div>
            <ul className="feature-list">
              <li><Check size={14} /> Simple forms — no JSON required</li>
              <li><Check size={14} /> Live preview of every generated file</li>
              <li><Check size={14} /> Advanced code editor if you want it</li>
              <li><Check size={14} /> One-click export with manifest + icon</li>
            </ul>
            <span className="card-cta">Open Behavior Studio <ArrowRight size={17} /></span>
          </button>
        </section>

        <section className="how-it-works">
          <h3><Wrench size={18} /> How it works</h3>
          <div className="steps">
            <div className="step"><span className="step-num">1</span><MousePointer2 size={20} /><strong>Choose a pack</strong><small>Resource for looks, behavior for logic.</small></div>
            <div className="step"><span className="step-num">2</span><Box size={20} /><strong>Make it yours</strong><small>Paint textures or fill in simple forms.</small></div>
            <div className="step"><span className="step-num">3</span><Download size={20} /><strong>Export & install</strong><small>Download a .zip and activate it in game.</small></div>
          </div>
        </section>

      </main>

      <footer className="home-footer">
        <span>BlockForge — a fan-made tool, not affiliated with Mojang or Microsoft.</span>
        <span>Minecraft is a trademark of Mojang AB.</span>
      </footer>
    </div>
  );
}
