export interface BehaviorTemplate {
  key: string;
  label: string;
  description: string;
  path: string;
  content: string;
}

export const BEHAVIOR_TEMPLATES: BehaviorTemplate[] = [
  {
    key: "entity",
    label: "Custom Entity",
    description: "A simple passive mob with health and random walking.",
    path: "entities/example_creature.json",
    content: `{
  "format_version": "1.20.0",
  "minecraft:entity": {
    "description": {
      "identifier": "addonbuild:example_creature",
      "is_summonable": true,
      "is_spawnable": true,
      "is_experimental": false
    },
    "components": {
      "minecraft:collision_box": { "width": 0.8, "height": 1.8 },
      "minecraft:health": { "value": 20, "max": 20 },
      "minecraft:movement": { "value": 0.2 },
      "minecraft:despawn": { "remove_on_chunk_kill": true },
      "minecraft:behavior.random_walk": { "priority": 2, "interval": 60 },
      "minecraft:behavior.look_at_player": { "priority": 3, "follow_range": 12 }
    }
  }
}
`,
  },
  {
    key: "item",
    label: "Custom Item",
    description: "A stackable item with an icon texture reference.",
    path: "items/example_item.json",
    content: `{
  "format_version": "1.20.0",
  "minecraft:item": {
    "description": {
      "identifier": "addonbuild:example_item",
      "category": "Equipment"
    },
    "components": {
      "minecraft:max_stack_size": 16,
      "minecraft:hand_equipped": false,
      "minecraft:icon": { "texture": "example_item" }
    }
  }
}
`,
  },
  {
    key: "loot_table",
    label: "Loot Table",
    description: "Drops a diamond when an entity is defeated.",
    path: "loot_tables/entities/example_loot.json",
    content: `{
  "format_version": "1.20.0",
  "minecraft:loot_table": {
    "pools": [
      {
        "rolls": 1,
        "entries": [
          { "type": "item", "name": "minecraft:diamond", "weight": 1 }
        ]
      }
    ]
  }
}
`,
  },
  {
    key: "recipe",
    label: "Crafting Recipe",
    description: "A shaped 3x3 crafting recipe.",
    path: "recipes/example_recipe.json",
    content: `{
  "format_version": "1.20.0",
  "minecraft:recipe_shaped": {
    "description": { "identifier": "addonbuild:example_recipe" },
    "tags": ["crafting_table"],
    "pattern": ["###", "#D#", "###"],
    "key": {
      "#": { "item": "minecraft:iron_ingot" },
      "D": { "item": "minecraft:diamond" }
    },
    "result": [{ "item": "minecraft:golden_apple", "count": 1 }]
  }
}
`,
  },
  {
    key: "function",
    label: "Function (.mcfunction)",
    description: "A list of commands run with /function.",
    path: "functions/example.mcfunction",
    content: `# AddonBUILD example function
# Run in game with: /function addonbuild/example

say Hello from AddonBUILD!
give @p minecraft:diamond 1
tellraw @a {"rawtext":[{"text":"§aCustom function executed!"}]}
`,
  },
  {
    key: "animation",
    label: "Animation",
    description: "A simple looped entity animation.",
    path: "animations/example.animation.json",
    content: `{
  "format_version": "1.8.0",
  "animations": {
    "animation.addonbuild.example.bob": {
      "loop": true,
      "animation_length": 1.0,
      "bones": {
        "body": {
          "position": {
            "0.0": [0, 0, 0],
            "0.5": [0, 1, 0],
            "1.0": [0, 0, 0]
          }
        }
      }
    }
  }
}
`,
  },
];

export const DEFAULT_BEHAVIOR_FILES = [
  ...BEHAVIOR_TEMPLATES.filter((t) => ["entity", "item", "loot_table", "recipe", "function"].includes(t.key)).map(
    (t) => ({ path: t.path, content: t.content }),
  ),
  {
    path: "README.txt",
    content: `ADDONBUILD BEHAVIOR PACK
=========================

This pack was generated in AddonBUILD.

INSTALL
-------
1. Save/export this pack as a .zip or .mcpack.
2. Open it with Minecraft Bedrock, or place the unpacked folder in:
   Android:  games/com.mojang/behavior_packs/
   Windows:  %LOCALAPPDATA%\\Packages\\Microsoft.MinecraftUWP_8wekyb3d8bbwe\\LocalState\\games\\com.mojang\\behavior_packs/
3. Create a new world and activate the pack under Behavior Packs.

TIP
---
Custom items also need a Resource Pack containing textures/item_texture.json and the
item icon PNG. Use the Resource Pack Studio in AddonBUILD to create those files.
`,
  },
];

export const SNIPPETS = [
  {
    label: "Health",
    text: `"minecraft:health": { "value": 20, "max": 20 },`,
  },
  {
    label: "Collision box",
    text: `"minecraft:collision_box": { "width": 0.8, "height": 1.8 },`,
  },
  {
    label: "Movement",
    text: `"minecraft:movement": { "value": 0.25 },`,
  },
  {
    label: "Follow player",
    text: `"minecraft:behavior.follow_player": { "priority": 4, "speed_multiplier": 1.0, "follow_range": 16 },`,
  },
  {
    label: "Interact",
    text: `"minecraft:interact": { "interactions": [{ "on_interact": { "event": "example.interact" } }] },`,
  },
  {
    label: "Event",
    text: `"events": { "example:spawn": { "add": { "component_groups": [] } } },`,
  },
];
