"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import {
  Download, Eraser, Grid3X3, Maximize2, Minus, PaintBucket, Pencil,
  Pipette, Plus, Redo2, Square, Trash2, Undo2, Upload,
} from "lucide-react";
import {
  decodeTexture, pixelsToDataUrl, resizeTexture, TRANSPARENT,
  type TextureData,
} from "@/lib/texture-gen";
import { downloadBlob } from "@/lib/pack";

type Tool = "pencil" | "eraser" | "fill" | "eyedropper" | "line" | "rect";
type Point = { x: number; y: number };

const TOOLS: { key: Tool; label: string; icon: typeof Pencil; hint: string }[] = [
  { key: "pencil", label: "Pencil", icon: Pencil, hint: "B" },
  { key: "eraser", label: "Eraser", icon: Eraser, hint: "E" },
  { key: "fill", label: "Fill", icon: PaintBucket, hint: "G" },
  { key: "eyedropper", label: "Pick color", icon: Pipette, hint: "I" },
  { key: "line", label: "Line", icon: Minus, hint: "L" },
  { key: "rect", label: "Rectangle", icon: Square, hint: "R" },
];

const PALETTE = [
  "#ffffff", "#c6c6c6", "#7d7d7d", "#3d3d3d", "#000000",
  "#f24e4e", "#e2872c", "#f2d33c", "#7dc955", "#2fa8c9",
  "#3b6fd4", "#8b5bd6", "#e46bb7", "#ffb6c1", "#a97446",
  "#8a5b30", "#dcd2a7", "#5aa33c", "#68a64a", "#4bb9bd",
  "#e8c33e", "#d94b3d", "#9c71c6", "#5ed3d6", "#2e2445",
  "#e5dfc8", "#b99bb7", "#4d4d56", "#848484", "#1b1b1b",
  "#5d8a52", "#d27c29", "#418c86", "#e6e3db", "#ff9133",
];

const ZOOM_LEVELS = [2, 4, 6, 8, 12, 16, 24, 32];

function parseColor(hex: string): [number, number, number, number] {
  let h = hex.replace("#", "");
  if (h.length === 3 || h.length === 4) h = h.split("").map((c) => c + c).join("");
  const r = parseInt(h.slice(0, 2), 16) || 0;
  const g = parseInt(h.slice(2, 4), 16) || 0;
  const b = parseInt(h.slice(4, 6), 16) || 0;
  const a = h.length >= 8 ? parseInt(h.slice(6, 8), 16) : 255;
  return [r, g, b, Number.isNaN(a) ? 255 : a];
}

function cssColor(hex: string): string {
  const [r, g, b, a] = parseColor(hex);
  return `rgba(${r},${g},${b},${(a / 255).toFixed(3)})`;
}

function solidColor(color: string): string {
  return color.length === 7 ? `${color}ff` : color;
}

function linePoints(a: Point, b: Point): Point[] {
  const points: Point[] = [];
  let x0 = a.x, y0 = a.y;
  const dx = Math.abs(b.x - x0), dy = Math.abs(b.y - y0);
  const sx = x0 < b.x ? 1 : -1, sy = y0 < b.y ? 1 : -1;
  let err = dx - dy;
  for (;;) {
    points.push({ x: x0, y: y0 });
    if (x0 === b.x && y0 === b.y) break;
    const e2 = 2 * err;
    if (e2 > -dy) { err -= dy; x0 += sx; }
    if (e2 < dx) { err += dx; y0 += sy; }
  }
  return points;
}

function rectPoints(a: Point, b: Point): Point[] {
  const x0 = Math.min(a.x, b.x), x1 = Math.max(a.x, b.x);
  const y0 = Math.min(a.y, b.y), y1 = Math.max(a.y, b.y);
  const points: Point[] = [];
  for (let x = x0; x <= x1; x++) { points.push({ x, y: y0 }); points.push({ x, y: y1 }); }
  for (let y = y0; y <= y1; y++) { points.push({ x: x0, y }); points.push({ x: x1, y }); }
  return points;
}

interface Props {
  textureKey: string;
  name: string;
  data: TextureData;
  onChange: (next: TextureData) => void;
}

export default function PixelEditor({ textureKey, name, data, onChange }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const dataRef = useRef(data);
  const onChangeRef = useRef(onChange);
  onChangeRef.current = onChange;

  const historyRef = useRef<{ past: TextureData[]; future: TextureData[] }>({ past: [], future: [] });
  const drawingRef = useRef(false);
  const dragStartRef = useRef<TextureData | null>(null);
  const previewStartRef = useRef<Point | null>(null);

  const [localData, setLocalData] = useState(data);

  const [tool, setTool] = useState<Tool>("pencil");
  const [color, setColor] = useState("#e8c33e");
  const [brushSize, setBrushSize] = useState(1);
  const [zoom, setZoom] = useState(16);
  const [showGrid, setShowGrid] = useState(true);
  const [hover, setHover] = useState<Point | null>(null);
  const [previewEnd, setPreviewEnd] = useState<Point | null>(null);
  const [showResize, setShowResize] = useState(false);
  const [resizeW, setResizeW] = useState(data.width);
  const [resizeH, setResizeH] = useState(data.height);
  const [, setHistoryTick] = useState(0);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Sync when the parent swaps the texture (or loads an imported version).
  useEffect(() => {
    if (data !== dataRef.current) {
      dataRef.current = data;
      setLocalData(data);
      setResizeW(data.width);
      setResizeH(data.height);
      historyRef.current = { past: [], future: [] };
      setHistoryTick((t) => t + 1);
    }
  }, [data, textureKey]);

  useEffect(() => {
    const defaultZoom = data.width <= 16 ? 16 : data.width <= 32 ? 8 : data.width <= 64 ? 6 : 4;
    setZoom(defaultZoom);
    setResizeW(data.width);
    setResizeH(data.height);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [textureKey]);

  const update = useCallback((next: TextureData, recordHistory = true) => {
    if (recordHistory) {
      historyRef.current.past.push(dataRef.current);
      if (historyRef.current.past.length > 60) historyRef.current.past.shift();
      historyRef.current.future = [];
      setHistoryTick((t) => t + 1);
    }
    dataRef.current = next;
    setLocalData(next);
    onChangeRef.current(next);
  }, []);

  const undo = useCallback(() => {
    const past = historyRef.current.past;
    if (!past.length) return;
    const previous = past.pop()!;
    historyRef.current.future.push(dataRef.current);
    dataRef.current = previous;
    setLocalData(previous);
    onChangeRef.current(previous);
    setHistoryTick((t) => t + 1);
  }, []);

  const redo = useCallback(() => {
    const future = historyRef.current.future;
    if (!future.length) return;
    const next = future.pop()!;
    historyRef.current.past.push(dataRef.current);
    dataRef.current = next;
    setLocalData(next);
    onChangeRef.current(next);
    setHistoryTick((t) => t + 1);
  }, []);

  // Canvas rendering
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const { width: w, height: h } = localData;
    const scale = zoom;
    canvas.width = w * scale;
    canvas.height = h * scale;
    const ctx = canvas.getContext("2d")!;
    ctx.imageSmoothingEnabled = false;

    const cell = Math.max(8, scale * 2);
    ctx.fillStyle = "#c8c8c8";
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.fillStyle = "#eeeeee";
    for (let cy = 0; cy < canvas.height; cy += cell) {
      for (let cx = 0; cx < canvas.width; cx += cell) {
        if (((cx / cell) | 0) % 2 === ((cy / cell) | 0) % 2) {
          ctx.fillRect(cx, cy, Math.min(cell, canvas.width - cx), Math.min(cell, canvas.height - cy));
        }
      }
    }

    for (let y = 0; y < h; y++) {
      for (let x = 0; x < w; x++) {
        const px = localData.pixels[y * w + x] ?? TRANSPARENT;
        const [r, g, b, a] = parseColor(px);
        if (a === 0) continue;
        ctx.fillStyle = `rgba(${r},${g},${b},${a / 255})`;
        ctx.fillRect(x * scale, y * scale, scale, scale);
      }
    }

    if (showGrid && scale >= 6) {
      ctx.lineWidth = 1;
      for (let x = 0; x <= w; x++) {
        ctx.strokeStyle = x % 8 === 0 ? "rgba(0,0,0,0.42)" : "rgba(0,0,0,0.16)";
        ctx.beginPath(); ctx.moveTo(x * scale + 0.5, 0); ctx.lineTo(x * scale + 0.5, canvas.height); ctx.stroke();
      }
      for (let y = 0; y <= h; y++) {
        ctx.strokeStyle = y % 8 === 0 ? "rgba(0,0,0,0.42)" : "rgba(0,0,0,0.16)";
        ctx.beginPath(); ctx.moveTo(0, y * scale + 0.5); ctx.lineTo(canvas.width, y * scale + 0.5); ctx.stroke();
      }
    }

    const start = previewStartRef.current;
    if (start && previewEnd && (tool === "line" || tool === "rect")) {
      const points = tool === "line" ? linePoints(start, previewEnd) : rectPoints(start, previewEnd);
      ctx.fillStyle = cssColor(color);
      ctx.globalAlpha = 0.75;
      for (const p of points) {
        if (p.x >= 0 && p.y >= 0 && p.x < w && p.y < h) {
          ctx.fillRect(p.x * scale, p.y * scale, scale, scale);
        }
      }
      ctx.globalAlpha = 1;
    }

    if (hover && hover.x >= 0 && hover.y >= 0 && hover.x < w && hover.y < h) {
      ctx.lineWidth = 2;
      ctx.strokeStyle = "#ffffff";
      ctx.strokeRect(hover.x * scale + 1, hover.y * scale + 1, scale - 2, scale - 2);
      ctx.lineWidth = 1;
      ctx.strokeStyle = "#1b1b1b";
      ctx.strokeRect(hover.x * scale + 0.5, hover.y * scale + 0.5, scale - 1, scale - 1);
    }
  }, [localData, zoom, showGrid, hover, previewEnd, tool, color]);

  const pointFromEvent = (e: React.PointerEvent<HTMLCanvasElement>): Point => {
    const rect = e.currentTarget.getBoundingClientRect();
    const x = Math.floor(((e.clientX - rect.left) / rect.width) * localData.width);
    const y = Math.floor(((e.clientY - rect.top) / rect.height) * localData.height);
    return { x: Math.max(0, Math.min(localData.width - 1, x)), y: Math.max(0, Math.min(localData.height - 1, y)) };
  };

  const paintAt = (point: Point, noHistory = false) => {
    const current = dataRef.current;
    const pixels = [...current.pixels];
    const half = Math.floor(brushSize / 2);
    const value = tool === "eraser" ? TRANSPARENT : solidColor(color);
    let changed = false;
    for (let dy = 0; dy < brushSize; dy++) {
      for (let dx = 0; dx < brushSize; dx++) {
        const px = point.x + dx - half;
        const py = point.y + dy - half;
        if (px < 0 || py < 0 || px >= current.width || py >= current.height) continue;
        const i = py * current.width + px;
        if (pixels[i] !== value) { pixels[i] = value; changed = true; }
      }
    }
    if (changed) update({ ...current, pixels }, !noHistory);
  };

  const floodFill = (point: Point) => {
    const current = dataRef.current;
    const target = current.pixels[point.y * current.width + point.x] ?? TRANSPARENT;
    const replacement = solidColor(color);
    if (target === replacement) return;
    const pixels = [...current.pixels];
    const stack = [point.y * current.width + point.x];
    const seen = new Set<number>();
    while (stack.length) {
      const i = stack.pop()!;
      if (seen.has(i) || pixels[i] !== target) continue;
      seen.add(i);
      pixels[i] = replacement;
      const x = i % current.width;
      const y = Math.floor(i / current.width);
      if (x > 0) stack.push(i - 1);
      if (x < current.width - 1) stack.push(i + 1);
      if (y > 0) stack.push(i - current.width);
      if (y < current.height - 1) stack.push(i + current.width);
    }
    update({ ...current, pixels });
  };

  const onPointerDown = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (e.button !== 0) return;
    e.currentTarget.setPointerCapture(e.pointerId);
    const point = pointFromEvent(e);
    if (tool === "eyedropper") {
      const picked = dataRef.current.pixels[point.y * dataRef.current.width + point.x] ?? TRANSPARENT;
      if (parseColor(picked)[3] > 0) setColor(picked.slice(0, 7));
      setTool("pencil");
      return;
    }
    if (tool === "pencil" || tool === "eraser") {
      dragStartRef.current = dataRef.current;
      drawingRef.current = true;
      paintAt(point, true);
      return;
    }
    if (tool === "fill") { floodFill(point); return; }
    previewStartRef.current = point;
    setPreviewEnd(point);
    drawingRef.current = true;
  };

  const onPointerMove = (e: React.PointerEvent<HTMLCanvasElement>) => {
    const point = pointFromEvent(e);
    setHover(point);
    if (!drawingRef.current) return;
    if (tool === "pencil" || tool === "eraser") paintAt(point, true);
    else if (tool === "line" || tool === "rect") setPreviewEnd(point);
  };

  const onPointerUp = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (!drawingRef.current) return;
    if (e.currentTarget.hasPointerCapture(e.pointerId)) e.currentTarget.releasePointerCapture(e.pointerId);
    const start = previewStartRef.current;
    if ((tool === "pencil" || tool === "eraser") && dragStartRef.current) {
      if (dragStartRef.current !== dataRef.current) {
        historyRef.current.past.push(dragStartRef.current);
        if (historyRef.current.past.length > 60) historyRef.current.past.shift();
        historyRef.current.future = [];
        setHistoryTick((t) => t + 1);
      }
      dragStartRef.current = null;
    } else if (start && previewEnd && (tool === "line" || tool === "rect")) {
      const current = dataRef.current;
      const points = tool === "line" ? linePoints(start, previewEnd) : rectPoints(start, previewEnd);
      const pixels = [...current.pixels];
      const value = solidColor(color);
      for (const p of points) {
        if (p.x >= 0 && p.y >= 0 && p.x < current.width && p.y < current.height) {
          pixels[p.y * current.width + p.x] = value;
        }
      }
      update({ ...current, pixels });
      previewStartRef.current = null;
      setPreviewEnd(null);
    }
    drawingRef.current = false;
  };

  // Keyboard shortcuts
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement;
      if (target && ["INPUT", "TEXTAREA", "SELECT"].includes(target.tagName)) return;
      const key = e.key.toLowerCase();
      if ((e.ctrlKey || e.metaKey) && key === "z") { e.preventDefault(); e.shiftKey ? redo() : undo(); return; }
      if ((e.ctrlKey || e.metaKey) && key === "y") { e.preventDefault(); redo(); return; }
      if (e.ctrlKey || e.metaKey || e.altKey) return;
      const toolKeys: Record<string, Tool> = { b: "pencil", e: "eraser", g: "fill", i: "eyedropper", l: "line", r: "rect" };
      if (toolKeys[key]) setTool(toolKeys[key]);
      if (key === "h") setShowGrid((v) => !v);
      if (key === "[" ) setBrushSize((v) => Math.max(1, v - 1));
      if (key === "]") setBrushSize((v) => Math.min(8, v + 1));
      if (key === "+" || key === "=") setZoom((v) => ZOOM_LEVELS[Math.min(ZOOM_LEVELS.length - 1, ZOOM_LEVELS.indexOf(v) + 1)]);
      if (key === "-") setZoom((v) => ZOOM_LEVELS[Math.max(0, ZOOM_LEVELS.indexOf(v) - 1)]);
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [undo, redo]);

  const handleImageImport = async (file: File | undefined) => {
    if (!file) return;
    try {
      const imported = await decodeTexture(file, 256);
      update(imported);
    } catch (err) {
      console.error(err);
      alert("Could not read that image. Try a PNG file.");
    }
  };

  const exportPng = () => {
    const url = pixelsToDataUrl(dataRef.current);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${textureKey.split("/").pop() ?? "texture"}.png`;
    a.click();
  };

  const zoomIndex = ZOOM_LEVELS.indexOf(zoom);

  return (
    <div className="pixel-editor">
      <div className="editor-toolbar">
        <div className="tool-group">
          {TOOLS.map((t) => {
            const Icon = t.icon;
            return (
              <button
                key={t.key}
                title={`${t.label} (${t.hint})`}
                className={`tool-btn ${tool === t.key ? "active" : ""}`}
                onClick={() => setTool(t.key)}
              >
                <Icon size={17} />
              </button>
            );
          })}
        </div>
        <div className="toolbar-divider" />
        <div className="tool-group">
          <button className="tool-btn" title="Undo (Ctrl+Z)" onClick={undo}><Undo2 size={17} /></button>
          <button className="tool-btn" title="Redo (Ctrl+Y)" onClick={redo}><Redo2 size={17} /></button>
          <button className="tool-btn danger" title="Clear canvas" onClick={() => update({ ...dataRef.current, pixels: dataRef.current.pixels.map(() => TRANSPARENT) })}><Trash2 size={17} /></button>
        </div>
        <div className="toolbar-divider" />
        <div className="tool-group">
          <button className="tool-btn" title="Zoom out (-)" onClick={() => setZoom(ZOOM_LEVELS[Math.max(0, zoomIndex - 1)])}><Minus size={16} /></button>
          <span className="zoom-label">{zoom}×</span>
          <button className="tool-btn" title="Zoom in (+)" onClick={() => setZoom(ZOOM_LEVELS[Math.min(ZOOM_LEVELS.length - 1, zoomIndex + 1)])}><Plus size={16} /></button>
          <button className={`tool-btn ${showGrid ? "active" : ""}`} title="Toggle grid (H)" onClick={() => setShowGrid((v) => !v)}><Grid3X3 size={17} /></button>
        </div>
        <div className="toolbar-spacer" />
        <div className="tool-group">
          <button className="tool-btn" title="Change canvas size" onClick={() => setShowResize((v) => !v)}><Maximize2 size={16} /></button>
          <button className="tool-btn" title="Import a PNG image" onClick={() => fileInputRef.current?.click()}><Upload size={16} /></button>
          <button className="tool-btn" title="Export this texture as PNG" onClick={exportPng}><Download size={16} /></button>
          <input ref={fileInputRef} type="file" accept="image/png,image/*" hidden onChange={(e) => { handleImageImport(e.target.files?.[0]); e.target.value = ""; }} />
        </div>
      </div>

      {showResize && (
        <div className="resize-bar">
          <span>Canvas size</span>
          <input type="number" min={1} max={512} value={resizeW} onChange={(e) => setResizeW(Math.max(1, Math.min(512, Number(e.target.value) || 1)))} />
          <span>×</span>
          <input type="number" min={1} max={512} value={resizeH} onChange={(e) => setResizeH(Math.max(1, Math.min(512, Number(e.target.value) || 1)))} />
          <button className="mini-btn" onClick={() => { update(resizeTexture(dataRef.current, resizeW, resizeH)); setShowResize(false); }}>Apply</button>
          <button className="mini-btn ghost" onClick={() => setShowResize(false)}>Cancel</button>
        </div>
      )}

      <div className="canvas-viewport">
        <canvas
          ref={canvasRef}
          className="editor-canvas"
          onPointerDown={onPointerDown}
          onPointerMove={onPointerMove}
          onPointerUp={onPointerUp}
          onPointerCancel={onPointerUp}
          onPointerLeave={() => setHover(null)}
          onContextMenu={(e) => e.preventDefault()}
        />
      </div>

      <div className="palette-bar">
        <div className="palette-swatches">
          {PALETTE.map((c) => (
            <button
              key={c}
              className={`swatch ${color.toLowerCase() === c.toLowerCase() ? "selected" : ""}`}
              style={{ background: c }}
              title={c}
              onClick={() => setColor(c)}
            />
          ))}
        </div>
        <div className="color-controls">
          <label className="color-input-wrap" title="Custom color">
            <input type="color" value={color.length === 7 ? color : color.slice(0, 7)} onChange={(e) => setColor(e.target.value)} />
          </label>
          <div className="brush-control">
            <span>Brush</span>
            <button className="mini-btn" onClick={() => setBrushSize((v) => Math.max(1, v - 1))}>–</button>
            <strong>{brushSize}</strong>
            <button className="mini-btn" onClick={() => setBrushSize((v) => Math.min(8, v + 1))}>+</button>
          </div>
        </div>
      </div>

      <div className="editor-status">
        <span className="status-chip"><strong>{name}</strong></span>
        <span className="status-chip">{localData.width} × {localData.height} px</span>
        <span className="status-chip">{hover ? `x ${hover.x}  y ${hover.y}` : "x –  y –"}</span>
        <span className="status-chip"><i className="color-dot" style={{ background: color }} /> {color.toUpperCase()}</span>
        <span className="status-hint">B pencil · E eraser · G fill · I pick · L line · R rect · Ctrl+Z undo</span>
      </div>
    </div>
  );
}
