# AddonBUILD 2.0 — Minecraft Add-On Maker

A browser-based Minecraft **Bedrock Edition** add-on maker built with Next.js 16, React 19 and TypeScript. Choose a Resource Pack or Behavior Pack, edit it, and export a ready-to-install add-on — no installs or accounts required.

## Run it

```bash
npm install
npm run dev
```

Then open [http://localhost:3000](http://localhost:3000).

For a production build: `npm run build && npm start`.

## What's new in 2.0

- **New app shell** — sidebar, dashboard, top bar, command palette (`Ctrl/⌘ + K`) and global save shortcut (`Ctrl/⌘ + S`).
- **Saved projects** — create, rename, favorite, duplicate and delete packs. Work autosaves in this browser; back up and restore the whole workspace from Settings.
- **Themes and defaults** — dark/light/system themes, four accent colors, compact mode, pixel-grid and new-pack defaults.
- **Project-aware studios** — switch projects from inside either studio without losing your place; all edits and pack details persist per project.
- **Texture workflow upgrades** — favorites, recent textures, original-vs-edit comparison and a shared `.zip` / `.mcpack` export dialog.
- **Expanded Quick Build** — creatures, items, loot, recipes, commands, blocks and animations with form previews; the Code Editor is still one click away.

## Resource Pack Studio

- **4,886 real vanilla textures**, generated from the file tree of [`Mojang/bedrock-samples`](https://github.com/Mojang/bedrock-samples) and loaded on demand from the official repository — nothing is redistributed. Offline placeholders are generated locally when the network is unavailable.
- Full pixel editor: pencil, eraser, fill, eyedropper, line, rectangle, brush sizes, zoom, grid, undo/redo, canvas resize, PNG import/export and a Minecraft-style palette.
- Search by display name or game path, category filters, favorites, recents, load-more browsing and custom texture paths.
- **Import a texture pack** (`.zip` / `.mcpack`): every PNG under `textures/` is decoded and loaded into the editor.
- Exports a valid Bedrock resource pack: `manifest.json`, generated `pack_icon.png`, and every changed texture at its original path. Download as `.zip` or `.mcpack`.

## Behavior Pack Studio

- **Quick Build** is the default: fill in simple forms for creatures, items, loot drops, recipes, commands, blocks and animations — no JSON knowledge needed. Each form shows a live preview of the file it generates.
- **Code Editor** mode for advanced users, with file tree, JSON templates, live validation, formatting, snippets, and add/rename/delete files.
- Exports a valid Bedrock behavior pack with generated `manifest.json` and `pack_icon.png` as `.zip` or `.mcpack`.

## Project layout

```
app/
  page.tsx                  AppProvider + AppShell entry
  layout.tsx                metadata and global styles
  globals.css               v1 studio styles + v2 design system
components/
  AppProvider.tsx           global state, projects, activity and toasts
  AppShell.tsx              sidebar, topbar and global shortcuts
  Dashboard.tsx             landing dashboard
  Projects.tsx              saved-pack library
  Templates.tsx             starter gallery
  Settings.tsx              theme, defaults and workspace backup
  Help.tsx                  guide, shortcuts and FAQ
  CommandPalette.tsx        fuzzy command/project search
  ResourceStudio.tsx        texture browser, favorites, compare, import/export
  PixelEditor.tsx           canvas pixel editor
  BehaviorStudio.tsx        Quick Build + code editor + export
  BehaviorBuilder.tsx       form-based behavior pack generator
  ExportDialog.tsx          shared .zip / .mcpack export dialog
  ui.tsx                    shared modal, fields, toggles and badges
lib/
  store.ts                  project/settings persistence
  textures.ts               vanilla texture catalog API
  vanilla-textures.json     generated list of real texture paths
  texture-gen.ts            image/pixel utilities
  behavior-templates.ts     behavior pack templates & snippets
  pack.ts                   manifest generation and ZIP export
```

## Credits

Textures are loaded from Mojang's official [bedrock-samples](https://github.com/Mojang/bedrock-samples) repository and are subject to the [Minecraft EULA](https://www.minecraft.net/en-us/eula). AddonBUILD is a fan-made tool, not affiliated with Mojang or Microsoft.
