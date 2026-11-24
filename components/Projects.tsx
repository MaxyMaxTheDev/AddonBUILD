"use client";

import { useMemo, useState } from "react";
import {
  ArrowRight, Clock3, Copy, FileJson, FolderKanban, Image as ImageIcon, Pencil,
  Plus, Search, Star, Trash2,
} from "lucide-react";
import { useApp } from "./AppProvider";
import { EmptyState, Field, Modal, SectionTitle, Segmented } from "./ui";
import { relativeTime, type PackType } from "@/lib/store";
import { TEXTURE_CATALOG } from "@/lib/textures";

type Filter = "all" | PackType;
type Sort = "recent" | "name" | "created";

export default function Projects() {
  const {
    projects, openProject, createProject, updateProject, deleteProject, duplicateProject,
    setView,
  } = useApp();
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState<Filter>("all");
  const [sort, setSort] = useState<Sort>("recent");
  const [creating, setCreating] = useState(false);
  const [name, setName] = useState("");
  const [type, setType] = useState<PackType>("resource");
  const [renaming, setRenaming] = useState<string | null>(null);
  const [renameValue, setRenameValue] = useState("");

  const visible = useMemo(() => {
    const q = query.trim().toLowerCase();
    return projects
      .filter((project) => filter === "all" || project.type === filter)
      .filter((project) => !q || project.name.toLowerCase().includes(q) || project.description.toLowerCase().includes(q))
      .sort((a, b) => {
        if (sort === "name") return a.name.localeCompare(b.name);
        if (sort === "created") return b.createdAt - a.createdAt;
        return b.updatedAt - a.updatedAt;
      });
  }, [projects, query, filter, sort]);

  const commitRename = (id: string) => {
    if (renameValue.trim()) updateProject(id, { name: renameValue.trim(), meta: { ...projects.find((p) => p.id === id)!.meta, name: renameValue.trim() } });
    setRenaming(null);
  };

  return (
    <div className="page-wrap projects-page">
      <SectionTitle
        eyebrow="LIBRARY"
        title="Projects"
        action={<button className="btn-v2 primary small" onClick={() => setCreating(true)}><Plus size={15} /> New project</button>}
      />

      <div className="toolbar-v2">
        <div className="search-v2"><Search size={16} /><input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search projects…" /></div>
        <Segmented
          value={filter}
          onChange={setFilter}
          options={[
            { value: "all", label: `All (${projects.length})` },
            { value: "resource", label: "Resource" },
            { value: "behavior", label: "Behavior" },
          ]}
        />
        <select className="select-v2" value={sort} onChange={(e) => setSort(e.target.value as Sort)}>
          <option value="recent">Recently updated</option>
          <option value="created">Newest first</option>
          <option value="name">Name A–Z</option>
        </select>
      </div>

      {visible.length ? (
        <div className="project-grid">
          {visible.map((project) => (
            <div key={project.id} className="project-card">
              <div className={`project-card-cover ${project.type}`}>
                {project.type === "resource" ? <ImageIcon size={30} /> : <FileJson size={30} />}
                <span>{project.type === "resource" ? `${TEXTURE_CATALOG.length.toLocaleString()} textures` : "Quick Build"}</span>
              </div>
              <div className="project-card-body">
                {renaming === project.id ? (
                  <input
                    autoFocus
                    className="rename-input"
                    value={renameValue}
                    onChange={(e) => setRenameValue(e.target.value)}
                    onBlur={() => commitRename(project.id)}
                    onKeyDown={(e) => { if (e.key === "Enter") commitRename(project.id); if (e.key === "Escape") setRenaming(null); }}
                  />
                ) : (
                  <h3>{project.name}</h3>
                )}
                <p>{project.description}</p>
                <div className="project-card-meta"><Clock3 size={13} /> Updated {relativeTime(project.updatedAt)}</div>
              </div>
              <div className="project-card-actions">
                <button className="btn-v2 primary small" onClick={() => openProject(project.id)}>Open <ArrowRight size={14} /></button>
                <button className="icon-btn" title="Rename" onClick={() => { setRenaming(project.id); setRenameValue(project.name); }}><Pencil size={15} /></button>
                <button className="icon-btn" title={project.favorite ? "Unfavorite" : "Favorite"} onClick={() => updateProject(project.id, { favorite: !project.favorite })}>
                  <Star size={15} fill={project.favorite ? "currentColor" : "none"} />
                </button>
                <button className="icon-btn" title="Duplicate" onClick={() => duplicateProject(project.id)}><Copy size={15} /></button>
                <button className="icon-btn danger" title="Delete" onClick={() => { if (window.confirm(`Delete ${project.name}?`)) deleteProject(project.id); }}><Trash2 size={15} /></button>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <EmptyState
          icon={<FolderKanban size={28} />}
          title={projects.length ? "No matching projects" : "Your library is empty"}
          message={projects.length ? "Try another search or filter." : "Create a project or start from a template."}
          action={
            projects.length ? (
              <button className="btn-v2" onClick={() => { setQuery(""); setFilter("all"); }}>Clear filters</button>
            ) : (
              <div className="button-row centered">
                <button className="btn-v2 primary" onClick={() => setCreating(true)}><Plus size={15} /> New project</button>
                <button className="btn-v2" onClick={() => setView("templates")}>Browse templates</button>
              </div>
            )
          }
        />
      )}

      <Modal
        open={creating}
        onClose={() => setCreating(false)}
        title="Create a project"
        subtitle="Pick a pack type and give it a name."
        footer={<><button className="btn-v2" onClick={() => setCreating(false)}>Cancel</button><button className="btn-v2 primary" onClick={() => { createProject(name, type); setCreating(false); setName(""); }}><Plus size={15} /> Create</button></>}
      >
        <div className="modal-fields">
          <Field label="Pack type">
            <Segmented
              value={type}
              onChange={setType}
              options={[{ value: "resource", label: "Resource Pack" }, { value: "behavior", label: "Behavior Pack" }]}
            />
          </Field>
          <Field label="Project name">
            <input autoFocus value={name} onChange={(e) => setName(e.target.value)} placeholder="My awesome pack" />
          </Field>
        </div>
      </Modal>
    </div>
  );
}
