"use client";

import { useState } from "react";
import {
  ArrowRight, Boxes, Clock3, Download, FileJson, FolderKanban, Hammer, Image as ImageIcon,
  Layers3, Plus, Sparkles, Star, Wand2,
} from "lucide-react";
import { useApp } from "./AppProvider";
import { Badge, Card, EmptyState, Field, Modal, SectionTitle } from "./ui";
import { relativeTime, type PackType } from "@/lib/store";
import { CATEGORIES, TEXTURE_CATALOG } from "@/lib/textures";

export default function Dashboard() {
  const {
    projects, activity, favorites, createProject, openProject, openStudio, setView, duplicateProject,
    showToast,
  } = useApp();
  const [creating, setCreating] = useState<PackType | null>(null);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");

  const resourceCount = projects.filter((p) => p.type === "resource").length;
  const behaviorCount = projects.filter((p) => p.type === "behavior").length;
  const recent = [...projects].sort((a, b) => b.updatedAt - a.updatedAt).slice(0, 4);

  const startCreate = (type: PackType) => {
    setCreating(type);
    setName("");
    setDescription("");
  };

  const submit = () => {
    if (!creating) return;
    createProject(name, creating, description);
    setCreating(null);
  };

  return (
    <div className="page-wrap dashboard">
      <section className="hero-v2">
        <div className="hero-glow" />
        <div className="hero-content">
          <div className="hero-badges">
            <Badge tone="green"><Sparkles size={12} /> VERSION 2.0</Badge>
            <Badge tone="neutral">BEDROCK EDITION</Badge>
          </div>
          <h1>Build the add-on<br /><span>you actually imagine.</span></h1>
          <p>
            Paint real in-game textures, generate behaviors with simple forms, and export a
            ready-to-install pack. Everything runs right here in your browser.
          </p>
          <div className="hero-actions">
            <button className="btn-v2 primary large" onClick={() => startCreate("resource")}>
              <ImageIcon size={18} /> New resource pack
            </button>
            <button className="btn-v2 large" onClick={() => startCreate("behavior")}>
              <Hammer size={18} /> New behavior pack
            </button>
            <button className="btn-v2 ghost large" onClick={() => setView("templates")}>
              Browse templates <ArrowRight size={16} />
            </button>
          </div>
        </div>
        <div className="hero-art" aria-hidden="true">
          <div className="art-cube top" />
          <div className="art-cube left" />
          <div className="art-cube right" />
          <div className="art-grid" />
        </div>
      </section>

      <div className="stat-row">
        <div className="stat-card"><span><Layers3 size={16} /></span><div><strong>{TEXTURE_CATALOG.length.toLocaleString()}</strong><small>Real game textures</small></div></div>
        <div className="stat-card"><span><Boxes size={16} /></span><div><strong>{CATEGORIES.length}</strong><small>Texture folders</small></div></div>
        <div className="stat-card"><span><FolderKanban size={16} /></span><div><strong>{projects.length}</strong><small>Saved projects</small></div></div>
        <div className="stat-card"><span><Star size={16} /></span><div><strong>{favorites.length}</strong><small>Favorite textures</small></div></div>
      </div>

      <section className="dash-section">
        <SectionTitle
          eyebrow="JUMP IN"
          title="Choose your workspace"
          action={<button className="link-btn" onClick={() => setView("projects")}>View all projects <ArrowRight size={14} /></button>}
        />
        <div className="workspace-cards">
          <Card className="workspace-card resource" onClick={() => openStudio("resource")}>
            <div className="workspace-icon"><ImageIcon size={24} /></div>
            <div className="workspace-copy">
              <h3>Resource Studio</h3>
              <p>Browse every vanilla texture, paint it pixel by pixel, and export your overrides.</p>
              <div className="workspace-meta"><span>{resourceCount} projects</span><span>{TEXTURE_CATALOG.length.toLocaleString()} textures</span></div>
            </div>
            <ArrowRight size={18} />
          </Card>
          <Card className="workspace-card behavior" onClick={() => openStudio("behavior")}>
            <div className="workspace-icon"><Hammer size={24} /></div>
            <div className="workspace-copy">
              <h3>Behavior Studio</h3>
              <p>Create creatures, items, loot and commands with forms — or write the JSON yourself.</p>
              <div className="workspace-meta"><span>{behaviorCount} projects</span><span>Quick Build 2.0</span></div>
            </div>
            <ArrowRight size={18} />
          </Card>
        </div>
      </section>

      <div className="dash-columns">
        <section className="dash-panel">
          <SectionTitle
            eyebrow="PICK UP WHERE YOU LEFT OFF"
            title="Recent projects"
            action={<button className="link-btn" onClick={() => setView("projects")}>All projects</button>}
          />
          {recent.length ? (
            <div className="recent-list">
              {recent.map((project) => (
                <div key={project.id} className="recent-row">
                  <button className="recent-main" onClick={() => openProject(project.id)}>
                    <span className={`project-type-dot ${project.type}`}>
                      {project.type === "resource" ? <ImageIcon size={15} /> : <FileJson size={15} />}
                    </span>
                    <span className="recent-copy">
                      <strong>{project.name}</strong>
                      <small>{project.type === "resource" ? "Resource pack" : "Behavior pack"} · {relativeTime(project.updatedAt)}</small>
                    </span>
                  </button>
                  <button className="icon-btn" title="Duplicate" onClick={() => duplicateProject(project.id)}><Layers3 size={15} /></button>
                  <ArrowRight size={15} className="muted-icon" />
                </div>
              ))}
            </div>
          ) : (
            <EmptyState
              icon={<FolderKanban size={26} />}
              title="No projects yet"
              message="Create your first pack to see it here."
              action={<button className="btn-v2 primary small" onClick={() => startCreate("resource")}><Plus size={14} /> New project</button>}
            />
          )}
        </section>

        <section className="dash-panel">
          <SectionTitle eyebrow="ACTIVITY" title="Recent activity" />
          {activity.length ? (
            <div className="activity-list">
              {activity.slice(0, 6).map((item) => (
                <div key={item.id} className="activity-row">
                  <span className={`activity-dot ${item.kind}`} />
                  <span>{item.text}</span>
                  <small>{relativeTime(item.at)}</small>
                </div>
              ))}
            </div>
          ) : (
            <div className="activity-empty">Your exports, imports and edits will show up here.</div>
          )}
          <div className="whats-new">
            <div><Wand2 size={18} /><strong>What&apos;s new in 2.0</strong></div>
            <ul>
              <li>Saved projects with autosave and backups</li>
              <li>Command palette — press <kbd>Ctrl K</kbd></li>
              <li>Favorites, recents and texture comparison</li>
              <li>Expanded behavior builder with blocks and animations</li>
            </ul>
            <button className="link-btn" onClick={() => setView("help")}>Read the guide <ArrowRight size={14} /></button>
          </div>
        </section>
      </div>

      <Modal
        open={creating !== null}
        onClose={() => setCreating(null)}
        title={creating === "resource" ? "New resource pack" : "New behavior pack"}
        subtitle="Give it a name — you can change everything later."
        footer={<><button className="btn-v2" onClick={() => setCreating(null)}>Cancel</button><button className="btn-v2 primary" onClick={submit}><Plus size={15} /> Create project</button></>}
      >
        <div className="modal-fields">
          <Field label="Project name">
            <input autoFocus value={name} onChange={(e) => setName(e.target.value)} placeholder="My awesome pack" />
          </Field>
          <Field label="Description" hint="Shown in the pack manifest.">
            <textarea rows={3} value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Created with AddonBUILD 2.0" />
          </Field>
        </div>
      </Modal>
    </div>
  );
}
