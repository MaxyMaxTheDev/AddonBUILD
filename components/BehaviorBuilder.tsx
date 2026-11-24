"use client";

import { useMemo, useState } from "react";
import { Boxes, Gem, Package, ScrollText, Sparkles, Terminal } from "lucide-react";

type Kind = "entity" | "item" | "loot" | "recipe" | "function";

const KINDS: { key: Kind; label: string; icon: typeof Boxes }[] = [
  { key: "entity", label: "Creature", icon: Boxes },
  { key: "item", label: "Item", icon: Gem },
  { key: "loot", label: "Loot drop", icon: Package },
  { key: "recipe", label: "Recipe", icon: ScrollText },
  { key: "function", label: "Command", icon: Terminal },
];

function slug(value: string): string {
  return (
    value
      .trim()
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "_")
      .replace(/^_+|_+$/g, "") || "thing"
  );
}

export interface GeneratedFile {
  path: string;
  content: string;
  label: string;
}

export default function BehaviorBuilder({
  onAdd,
}: {
  onAdd: (file: GeneratedFile) => void;
}) {
  const [kind, setKind] = useState<Kind>("entity");
  const [idEdited, setIdEdited] = useState(false);

  const [name, setName] = useState("Crystal Buddy");
  const [identifier, setIdentifier] = useState("blockforge:crystal_buddy");
  const [health, setHealth] = useState(20);
  const [speed, setSpeed] = useState(0.2);
  const [behavior, setBehavior] = useState("wander");
  const [spawnable, setSpawnable] = useState(true);

  const [stack, setStack] = useState(16);
  const [icon, setIcon] = useState("gem");

  const [lootItem, setLootItem] = useState("minecraft:emerald");
  const [lootCount, setLootCount] = useState(1);

  const [ingredient, setIngredient] = useState("minecraft:emerald");
  const [result, setResult] = useState("minecraft:beacon");
  const [resultCount, setResultCount] = useState(1);

  const [command, setCommand] = useState("say Hello from my add-on!");

  const changeName = (value: string) => {
    setName(value);
    if (!idEdited) setIdentifier(`blockforge:${slug(value)}`);
  };

  const generated = useMemo<GeneratedFile>(() => {
    const id = identifier.trim() || `blockforge:${slug(name)}`;
    const short = slug(id.includes(":") ? id.split(":")[1] : id);

    if (kind === "entity") {
      const components: Record<string, unknown> = {
        "minecraft:collision_box": { width: 0.8, height: 1.8 },
        "minecraft:health": { value: health, max: health },
        "minecraft:movement": { value: speed },
        "minecraft:despawn": { remove_on_chunk_kill: true },
      };
      if (behavior === "wander") {
        components["minecraft:behavior.random_walk"] = { priority: 2, interval: 60 };
      } else if (behavior === "follow") {
        components["minecraft:behavior.follow_player"] = { priority: 3, speed_multiplier: 1, follow_range: 16 };
      }
      return {
        path: `entities/${short}.json`,
        label: name || short,
        content: JSON.stringify(
          {
            format_version: "1.20.0",
            "minecraft:entity": {
              description: {
                identifier: id,
                is_summonable: true,
                is_spawnable: spawnable,
                is_experimental: false,
              },
              components,
            },
          },
          null,
          2,
        ) + "\n",
      };
    }

    if (kind === "item") {
      return {
        path: `items/${short}.json`,
        label: name || short,
        content: JSON.stringify(
          {
            format_version: "1.20.0",
            "minecraft:item": {
              description: { identifier: id, category: "Equipment" },
              components: {
                "minecraft:max_stack_size": stack,
                "minecraft:icon": { texture: icon || short },
              },
            },
          },
          null,
          2,
        ) + "\n",
      };
    }

    if (kind === "loot") {
      return {
        path: `loot_tables/entities/${short}_loot.json`,
        label: `${name || short} loot`,
        content: JSON.stringify(
          {
            format_version: "1.20.0",
            "minecraft:loot_table": {
              pools: [
                {
                  rolls: 1,
                  entries: [{ type: "item", name: lootItem, count: lootCount }],
                },
              ],
            },
          },
          null,
          2,
        ) + "\n",
      };
    }

    if (kind === "recipe") {
      return {
        path: `recipes/${short}_recipe.json`,
        label: `${name || short} recipe`,
        content: JSON.stringify(
          {
            format_version: "1.20.0",
            "minecraft:recipe_shapeless": {
              description: { identifier: id },
              tags: ["crafting_table"],
              ingredients: [{ item: ingredient }],
              result: [{ item: result, count: resultCount }],
            },
          },
          null,
          2,
        ) + "\n",
      };
    }

    return {
      path: `functions/${short}.mcfunction`,
      label: name || short,
      content: `# ${name || short}\n${command}\n`,
    };
  }, [kind, identifier, name, health, speed, behavior, spawnable, stack, icon, lootItem, lootCount, ingredient, result, resultCount, command]);

  return (
    <div className="builder">
      <div className="builder-kinds">
        {KINDS.map((k) => {
          const Icon = k.icon;
          return (
            <button
              key={k.key}
              className={kind === k.key ? "active" : ""}
              onClick={() => setKind(k.key)}
            >
              <Icon size={20} />
              <span>{k.label}</span>
            </button>
          );
        })}
      </div>

      <div className="builder-form">
        {kind === "entity" && (
          <>
            <label className="form-field">
              <span>Creature name</span>
              <input value={name} onChange={(e) => changeName(e.target.value)} placeholder="Crystal Buddy" />
            </label>
            <label className="form-field">
              <span>Identifier</span>
              <input
                value={identifier}
                onChange={(e) => { setIdEdited(true); setIdentifier(e.target.value); }}
                placeholder="blockforge:crystal_buddy"
              />
            </label>
            <div className="form-row">
              <label className="form-field">
                <span>Health</span>
                <input type="number" min={1} max={1000} value={health} onChange={(e) => setHealth(Number(e.target.value) || 1)} />
              </label>
              <label className="form-field">
                <span>Speed</span>
                <input type="number" min={0.01} max={2} step={0.01} value={speed} onChange={(e) => setSpeed(Math.round((Number(e.target.value) || 0.1) * 100) / 100)} />
              </label>
            </div>
            <label className="form-field">
              <span>Behavior</span>
              <select value={behavior} onChange={(e) => setBehavior(e.target.value)}>
                <option value="wander">Wander around</option>
                <option value="follow">Follow the player</option>
                <option value="none">Stand still</option>
              </select>
            </label>
            <label className="form-check">
              <input type="checkbox" checked={spawnable} onChange={(e) => setSpawnable(e.target.checked)} />
              <span>Can spawn naturally in the world</span>
            </label>
          </>
        )}

        {kind === "item" && (
          <>
            <label className="form-field">
              <span>Item name</span>
              <input value={name} onChange={(e) => changeName(e.target.value)} placeholder="Power Gem" />
            </label>
            <label className="form-field">
              <span>Identifier</span>
              <input
                value={identifier}
                onChange={(e) => { setIdEdited(true); setIdentifier(e.target.value); }}
                placeholder="blockforge:power_gem"
              />
            </label>
            <div className="form-row">
              <label className="form-field">
                <span>Stack size</span>
                <input type="number" min={1} max={64} value={stack} onChange={(e) => setStack(Number(e.target.value) || 1)} />
              </label>
              <label className="form-field">
                <span>Icon texture</span>
                <input value={icon} onChange={(e) => setIcon(e.target.value)} placeholder="gem" />
              </label>
            </div>
            <p className="form-hint">The icon texture also needs a resource pack with a matching item_texture.json entry.</p>
          </>
        )}

        {kind === "loot" && (
          <>
            <label className="form-field">
              <span>Drop name</span>
              <input value={name} onChange={(e) => changeName(e.target.value)} placeholder="Treasure Drop" />
            </label>
            <label className="form-field">
              <span>Item to drop</span>
              <input value={lootItem} onChange={(e) => setLootItem(e.target.value)} placeholder="minecraft:emerald" />
            </label>
            <label className="form-field">
              <span>Amount</span>
              <input type="number" min={1} max={64} value={lootCount} onChange={(e) => setLootCount(Number(e.target.value) || 1)} />
            </label>
          </>
        )}

        {kind === "recipe" && (
          <>
            <label className="form-field">
              <span>Recipe name</span>
              <input value={name} onChange={(e) => changeName(e.target.value)} placeholder="Gem Beacon" />
            </label>
            <label className="form-field">
              <span>Identifier</span>
              <input
                value={identifier}
                onChange={(e) => { setIdEdited(true); setIdentifier(e.target.value); }}
                placeholder="blockforge:gem_beacon"
              />
            </label>
            <label className="form-field">
              <span>Ingredient</span>
              <input value={ingredient} onChange={(e) => setIngredient(e.target.value)} placeholder="minecraft:emerald" />
            </label>
            <div className="form-row">
              <label className="form-field">
                <span>Result item</span>
                <input value={result} onChange={(e) => setResult(e.target.value)} placeholder="minecraft:beacon" />
              </label>
              <label className="form-field">
                <span>Amount</span>
                <input type="number" min={1} max={64} value={resultCount} onChange={(e) => setResultCount(Number(e.target.value) || 1)} />
              </label>
            </div>
          </>
        )}

        {kind === "function" && (
          <>
            <label className="form-field">
              <span>Function name</span>
              <input value={name} onChange={(e) => changeName(e.target.value)} placeholder="Welcome Message" />
            </label>
            <label className="form-field">
              <span>Command</span>
              <input value={command} onChange={(e) => setCommand(e.target.value)} placeholder="say Hello!" />
            </label>
            <p className="form-hint">Run it in game with <code>/function {slug(name)}</code></p>
          </>
        )}

        <button className="primary-btn wide add-file-btn" onClick={() => onAdd(generated)}>
          <Sparkles size={16} /> Add to pack
        </button>
      </div>

      <div className="builder-preview">
        <div className="preview-heading"><span>Generated file</span><code>{generated.path}</code></div>
        <pre>{generated.content}</pre>
      </div>
    </div>
  );
}
