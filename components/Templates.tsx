"use client";

import { useMemo, useState } from "react";
import {
  Boxes, Brush, FileJson, Gem, Image as ImageIcon, Package, ScrollText, Shield,
  Sparkles, Terminal, Wand2,
} from "lucide-react";
import { useApp } from "./AppProvider";
import { Badge, Card, SectionTitle, Segmented } from "./ui";
import { BEHAVIOR_TEMPLATES } from "@/lib/behavior-templates";
import { STORAGE_KEYS, writeStorage, type PackType } from "@/lib/store";

type Category = "all" | PackType;

const RESOURCE_IDEAS = [
  {
    key: "texture-overhaul",
    label: "Texture Overhaul",
    description: "Recolor blocks and items across the whole game.",
    icon: Brush,
    tone: "green" as const,
    starter: "textures/blocks/stone",
  },
  {
    key: "item-pack",
    label: "Custom Item Pack",
    description: "Design icons for your new items and tools.",
    icon: Gem,
    tone: "purple" as const,
    starter: "textures/items/diamond",
  },
  {
    key: "gui-theme",
    label: "GUI Theme",
    description: "Restyle buttons, slots and inventory panels.",
    icon: ImageIcon,
    tone: "blue" as const,
    starter: "textures/gui/container/inventory.png",
  },
  {
    key: "entity-skins",
    label: "Entity Skins",
    description: "Paint mobs, animals and characters pixel by pixel.",
    icon: Shield,
    tone: "gold" as const,
    starter: "textures/entity/cow/cow.png",
  },
];

const BEHAVIOR_ICONS = [Boxes, Gem, Package, ScrollText, Terminal, Wand2];

export default function Templates() {
  const { createProject, showToast, log } = useApp();
  const [category, setCategory] = useState<Category>("all");

  const behaviorTemplates = useMemo(
    () =>
      BEHAVIOR_TEMPLATES.map((template, i) => ({
        key: template.key,
        label: template.label,
        description: template.description,
        path: template.path,
        content: template.content,
        icon: BEHAVIOR_ICONS[i % BEHAVIOR_ICONS.length],
      })),
    [],
  );

  const useBehavior = (template: (typeof behaviorTemplates)[number]) => {
    const project = createProject(template.label, "behavior", `Started from the ${template.label} template.`);
    writeStorage(STORAGE_KEYS.projectData(project.id, "behavior"), {
      files: [{ path: template.path, content: template.content }],
      meta: project.meta,
    });
    log(`Used ${template.label} template`, "create");
    showToast(`${template.label} template loaded`);
  };

  const useResource = (idea: (typeof RESOURCE_IDEAS)[number]) => {
    const project = createProject(idea.label, "resource", `Started from the ${idea.label} template.`);
    writeStorage(STORAGE_KEYS.projectData(project.id, "resource"), {
      starter: idea.starter,
      meta: project.meta,
    });
    log(`Used ${idea.label} template`, "create");
    showToast(`${idea.label} template loaded`);
  };

  const showResource = category === "all" || category === "resource";
  const showBehavior = category === "all" || category === "behavior";

  return (
    <div className="page-wrap templates-page">
      <SectionTitle
        eyebrow="START HERE"
        title="Template gallery"
        action={
          <Segmented
            value={category}
            onChange={setCategory}
            options={[
              { value: "all", label: "All" },
              { value: "resource", label: "Resource" },
              { value: "behavior", label: "Behavior" },
            ]}
          />
        }
      />

      <div className="template-intro">
        <Sparkles size={20} />
        <div>
          <strong>Start with a working example</strong>
          <p>Each template creates a new project you can edit and export immediately.</p>
        </div>
      </div>

      {showResource && (
        <section className="template-section">
          <h3><ImageIcon size={16} /> Resource pack starters</h3>
          <div className="template-grid">
            {RESOURCE_IDEAS.map((idea) => {
              const Icon = idea.icon;
              return (
                <Card key={idea.key} className="template-tile">
                  <div className={`template-icon ${idea.tone}`}><Icon size={22} /></div>
                  <Badge tone={idea.tone}>RESOURCE</Badge>
                  <h4>{idea.label}</h4>
                  <p>{idea.description}</p>
                  <button className="btn-v2 small" onClick={() => useResource(idea)}>Use template <Wand2 size={14} /></button>
                </Card>
              );
            })}
          </div>
        </section>
      )}

      {showBehavior && (
        <section className="template-section">
          <h3><FileJson size={16} /> Behavior pack starters</h3>
          <div className="template-grid">
            {behaviorTemplates.map((template) => {
              const Icon = template.icon;
              return (
                <Card key={template.key} className="template-tile">
                  <div className="template-icon blue"><Icon size={22} /></div>
                  <Badge tone="blue">BEHAVIOR</Badge>
                  <h4>{template.label}</h4>
                  <p>{template.description}</p>
                  <code className="template-path">{template.path}</code>
                  <button className="btn-v2 small" onClick={() => useBehavior(template)}>Use template <Wand2 size={14} /></button>
                </Card>
              );
            })}
          </div>
        </section>
      )}
    </div>
  );
}
