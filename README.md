# AddonBUILD — Minecraft Add-On Maker

A browser-based Minecraft **Bedrock Edition** add-on maker built with Next.js 16, React 19 and TypeScript.

## Run it

```bash
npm install
npm run dev
```

Then open [http://localhost:3000](http://localhost:3000).

For a production build: `npm run build && npm start`.

## Features

### Resource Pack Studio
- **4,886 real vanilla textures**, generated from the file tree of [`Mojang/bedrock-samples`](https://github.com/Mojang/bedrock-samples) and loaded on demand from the official repository — nothing is redistributed.
- Full pixel editor: pencil, eraser, fill, eyedropper, line, rectangle, brush sizes, zoom, grid, undo/redo, canvas resize, PNG import/export and a Minecraft-style palette.
- Search by display name or game path, category filters, load-more browsing and custom texture paths.
- **Import a texture pack** (`.zip` / `.mcpack`): every PNG under `textures/` is decoded and loaded into the editor.
- Exports a valid Bedrock resource pack: `manifest.json`, generated `pack_icon.png`, and every changed texture at its original path. Download as `.zip` or `.mcpack`.

### Behavior Pack Studio
- **Quick Build** mode: fill in simple forms for creatures, items, loot drops, recipes and commands — no JSON knowledge needed. Each form shows a live preview of the file it generates.
- **Code Editor** mode for advanced users, with file tree, JSON templates, live validation, formatting, snippets, and add/rename/delete files.
- Exports a valid Bedrock behavior pack with generated `manifest.json` and `pack_icon.png`.

## Project layout

```
app/                      Next.js app router entry + global styles
components/
  ModMaker.tsx            screen switcher
  Home.tsx                landing / pack type selection
  ResourceStudio.tsx      texture browser, pack settings, import/export
  PixelEditor.tsx         canvas pixel editor
  BehaviorStudio.tsx      behavior pack file tree + editor + export
  BehaviorBuilder.tsx     form-based behavior pack generator
lib/
  textures.ts             vanilla texture catalog (from vanilla-textures.json)
  vanilla-textures.json   generated list of real texture paths
  texture-gen.ts          image/pixel utilities
  behavior-templates.ts   behavior pack templates & snippets
  pack.ts                 manifest generation and ZIP export
```

## Credits

Textures are loaded from Mojang's official [bedrock-samples](https://github.com/Mojang/bedrock-samples) repository and are subject to the [Minecraft EULA](https://www.minecraft.net/en-us/eula). AddonBUILD is a fan-made tool, not affiliated with Mojang or Microsoft.
