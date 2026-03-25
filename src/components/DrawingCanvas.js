"use client";

import { useRef, useState, useEffect, useCallback } from "react";
import { createPortal } from "react-dom";
import {
  X,
  Undo2,
  Eraser,
  Pen,
  Save,
  Minus,
  Square,
  Circle as CircleIcon,
} from "lucide-react";
import styles from "./DrawingCanvas.module.css";

const COLORS = [
  { value: "#000000", label: "Black" },
  { value: "#ef4444", label: "Red" },
  { value: "#facc15", label: "Yellow" },
  { value: "#22c55e", label: "Green" },
  { value: "#38bdf8", label: "Cyan" },
  { value: "#ffffff", label: "White" },
  { value: "#a855f7", label: "Purple" },
];

const SIZES = [
  { label: "S", width: 2, dot: 4 },
  { label: "M", width: 5, dot: 8 },
  { label: "L", width: 12, dot: 12 },
];

const TOOLS = [
  { id: "pen", label: "Pen", icon: Pen },
  { id: "line", label: "Line", icon: Minus },
  { id: "rect", label: "Rectangle", icon: Square },
  { id: "circle", label: "Circle", icon: CircleIcon },
  { id: "eraser", label: "Eraser", icon: Eraser },
];

const CANVAS_W = 800;
const CANVAS_H = 600;

/**
 * Full-screen drawing canvas modal.
 * - Blank canvas: no `src` → white canvas at CANVAS_W × CANVAS_H
 * - Edit mode: `src` provided → loads image as background
 *
 * Props:
 *   src?         – optional data URL / image URL for editing
 *   onSave(url)  – called with PNG data URL on save
 *   onClose()    – close without saving
 */
export default function DrawingCanvas({ src, onSave, onClose }) {
  const canvasRef = useRef(null);
  const bgCanvasRef = useRef(null);
  const containerRef = useRef(null);

  const [tool, setTool] = useState("pen");
  const [color, setColor] = useState(COLORS[0].value);
  const [sizeIdx, setSizeIdx] = useState(1);
  const [drawing, setDrawing] = useState(false);
  const [strokes, setStrokes] = useState([]);
  const [currentStroke, setCurrentStroke] = useState(null);
  const [canvasSize, setCanvasSize] = useState({ w: CANVAS_W, h: CANVAS_H });
  const [displaySize, setDisplaySize] = useState({ w: 0, h: 0 });
  const [bgReady, setBgReady] = useState(!src);

  // Compute fitted display dimensions from canvas size + viewport
  useEffect(() => {
    const fit = () => {
      const maxW = window.innerWidth * 0.85;
      const maxH = window.innerHeight - 220; // room for toolbar + bottom bar
      const ratio = canvasSize.w / canvasSize.h;
      let w = Math.min(canvasSize.w, maxW);
      let h = w / ratio;
      if (h > maxH) {
        h = maxH;
        w = h * ratio;
      }
      setDisplaySize({ w: Math.round(w), h: Math.round(h) });
    };
    fit();
    window.addEventListener("resize", fit);
    return () => window.removeEventListener("resize", fit);
  }, [canvasSize]);

  // Load background image (edit mode)
  useEffect(() => {
    if (!src) return;
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => {
      setCanvasSize({ w: img.naturalWidth, h: img.naturalHeight });
      setBgReady(true);

      // Draw background onto the bg canvas
      requestAnimationFrame(() => {
        const bgCanvas = bgCanvasRef.current;
        if (!bgCanvas) return;
        bgCanvas.width = img.naturalWidth;
        bgCanvas.height = img.naturalHeight;
        const ctx = bgCanvas.getContext("2d");
        ctx.drawImage(img, 0, 0);
      });
    };
    img.src = src;
  }, [src]);

  // Set drawing canvas size when canvasSize changes
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    canvas.width = canvasSize.w;
    canvas.height = canvasSize.h;
  }, [canvasSize]);

  // Escape key
  useEffect(() => {
    const handleKey = (e) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, [onClose]);

  const renderStroke = (ctx, stroke) => {
    ctx.save();
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
    ctx.lineWidth = stroke.width;

    if (stroke.eraser) {
      ctx.globalCompositeOperation = "destination-out";
      ctx.strokeStyle = "rgba(0,0,0,1)";
    } else {
      ctx.globalCompositeOperation = "source-over";
      ctx.strokeStyle = stroke.color;
    }

    if (stroke.tool === "pen" || stroke.tool === "eraser") {
      if (stroke.points.length < 2) {
        ctx.restore();
        return;
      }
      ctx.beginPath();
      ctx.moveTo(stroke.points[0].x, stroke.points[0].y);
      for (let i = 1; i < stroke.points.length; i++) {
        ctx.lineTo(stroke.points[i].x, stroke.points[i].y);
      }
      ctx.stroke();
    } else if (stroke.tool === "line") {
      if (!stroke.start || !stroke.end) {
        ctx.restore();
        return;
      }
      ctx.beginPath();
      ctx.moveTo(stroke.start.x, stroke.start.y);
      ctx.lineTo(stroke.end.x, stroke.end.y);
      ctx.stroke();
    } else if (stroke.tool === "rect") {
      if (!stroke.start || !stroke.end) {
        ctx.restore();
        return;
      }
      const x = Math.min(stroke.start.x, stroke.end.x);
      const y = Math.min(stroke.start.y, stroke.end.y);
      const w = Math.abs(stroke.end.x - stroke.start.x);
      const h = Math.abs(stroke.end.y - stroke.start.y);
      ctx.strokeRect(x, y, w, h);
    } else if (stroke.tool === "circle") {
      if (!stroke.start || !stroke.end) {
        ctx.restore();
        return;
      }
      const cx = (stroke.start.x + stroke.end.x) / 2;
      const cy = (stroke.start.y + stroke.end.y) / 2;
      const rx = Math.abs(stroke.end.x - stroke.start.x) / 2;
      const ry = Math.abs(stroke.end.y - stroke.start.y) / 2;
      ctx.beginPath();
      ctx.ellipse(cx, cy, rx, ry, 0, 0, Math.PI * 2);
      ctx.stroke();
    }

    ctx.restore();
  };

  /* ── Drawing helpers ── */

  const redrawAll = useCallback((strokeList) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    for (const s of strokeList) {
      renderStroke(ctx, s);
    }
  }, []);

  useEffect(() => {
    if (bgReady) redrawAll(strokes);
  }, [strokes, bgReady, redrawAll]);

  /* ── Coordinate helpers ── */

  const getPos = (e) => {
    const canvas = canvasRef.current;
    if (!canvas) return { x: 0, y: 0 };
    const rect = canvas.getBoundingClientRect();
    const clientX = e.touches ? e.touches[0].clientX : e.clientX;
    const clientY = e.touches ? e.touches[0].clientY : e.clientY;
    // Scale from display coordinates to canvas internal coordinates
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;
    return {
      x: (clientX - rect.left) * scaleX,
      y: (clientY - rect.top) * scaleY,
    };
  };

  /* ── Pointer handlers ── */

  const handlePointerDown = (e) => {
    e.preventDefault();
    const pos = getPos(e);
    const isEraser = tool === "eraser";

    if (tool === "pen" || tool === "eraser") {
      setCurrentStroke({
        tool: isEraser ? "eraser" : "pen",
        color,
        width: SIZES[sizeIdx].width,
        eraser: isEraser,
        points: [pos],
      });
    } else {
      setCurrentStroke({
        tool,
        color,
        width: SIZES[sizeIdx].width,
        eraser: false,
        start: pos,
        end: pos,
      });
    }
    setDrawing(true);
  };

  const handlePointerMove = (e) => {
    if (!drawing || !currentStroke) return;
    e.preventDefault();
    const pos = getPos(e);

    let updated;
    if (currentStroke.tool === "pen" || currentStroke.tool === "eraser") {
      updated = { ...currentStroke, points: [...currentStroke.points, pos] };
    } else {
      updated = { ...currentStroke, end: pos };
    }
    setCurrentStroke(updated);

    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    redrawAll(strokes);
    renderStroke(ctx, updated);
  };

  const handlePointerUp = () => {
    if (!drawing || !currentStroke) return;

    const isValid =
      currentStroke.tool === "pen" || currentStroke.tool === "eraser"
        ? currentStroke.points.length >= 2
        : currentStroke.start && currentStroke.end;

    if (isValid) {
      setStrokes((prev) => [...prev, currentStroke]);
    }
    setCurrentStroke(null);
    setDrawing(false);
  };

  /* ── Actions ── */

  const handleUndo = () => setStrokes((prev) => prev.slice(0, -1));
  const handleClear = () => setStrokes([]);

  const handleSave = () => {
    const offscreen = document.createElement("canvas");
    offscreen.width = canvasSize.w;
    offscreen.height = canvasSize.h;
    const ctx = offscreen.getContext("2d");

    // Draw background
    if (src && bgCanvasRef.current) {
      ctx.drawImage(bgCanvasRef.current, 0, 0);
    } else {
      ctx.fillStyle = "#ffffff";
      ctx.fillRect(0, 0, offscreen.width, offscreen.height);
    }

    // Draw strokes
    const drawCanvas = canvasRef.current;
    if (drawCanvas) {
      ctx.drawImage(drawCanvas, 0, 0);
    }

    onSave(offscreen.toDataURL("image/png"));
  };

  const toolCursor = tool === "eraser" ? "cell" : "crosshair";

  return createPortal(
    <div className={styles.overlay}>
      <button className={styles.closeBtn} onClick={onClose} title="Close">
        <X size={22} />
      </button>

      {/* Toolbar */}
      <div className={styles.toolbar}>
        {/* Tool buttons */}
        <div className={styles.toolGroup}>
          {TOOLS.map((t) => {
            const Icon = t.icon;
            return (
              <button
                key={t.id}
                className={`${styles.toolBtn} ${tool === t.id ? styles.toolBtnActive : ""}`}
                onClick={() => setTool(t.id)}
                title={t.label}
              >
                <Icon size={14} />
              </button>
            );
          })}
        </div>

        {/* Colors */}
        <div className={styles.toolGroup}>
          <span className={styles.toolLabel}>Color</span>
          {COLORS.map((c) => (
            <button
              key={c.value}
              className={`${styles.swatch} ${color === c.value && tool !== "eraser" ? styles.swatchActive : ""}`}
              style={{
                background: c.value,
                border: c.value === "#000000" ? "2px solid #555" : undefined,
              }}
              onClick={() => {
                setColor(c.value);
                if (tool === "eraser") setTool("pen");
              }}
              title={c.label}
            />
          ))}
        </div>

        {/* Sizes */}
        <div className={styles.toolGroup}>
          <span className={styles.toolLabel}>Size</span>
          {SIZES.map((s, i) => (
            <button
              key={s.label}
              className={`${styles.sizeBtn} ${sizeIdx === i ? styles.sizeBtnActive : ""}`}
              onClick={() => setSizeIdx(i)}
              title={s.label}
            >
              <span
                className={styles.sizeDot}
                style={{ width: s.dot, height: s.dot }}
              />
            </button>
          ))}
        </div>

        {/* Undo / Clear */}
        <div className={styles.toolGroup}>
          <button
            className={styles.actionBtn}
            onClick={handleUndo}
            disabled={strokes.length === 0}
            title="Undo"
          >
            <Undo2 size={14} /> Undo
          </button>
          <button
            className={styles.actionBtn}
            onClick={handleClear}
            disabled={strokes.length === 0}
            title="Clear all"
          >
            <Eraser size={14} /> Clear
          </button>
        </div>
      </div>

      {/* Canvas */}
      <div className={styles.canvasArea} ref={containerRef}>
        {/* Hidden bg canvas for compositing */}
        <canvas ref={bgCanvasRef} style={{ display: "none" }} />

        {/* Visible canvas */}
        <div
          className={styles.canvasWrapper}
          style={{ width: displaySize.w, height: displaySize.h }}
        >
          {/* Background: show source image or white */}
          {src ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={src}
              alt="Background"
              className={styles.bgImage}
              draggable={false}
            />
          ) : (
            <div className={styles.bgWhite} />
          )}
          <canvas
            ref={canvasRef}
            className={styles.drawCanvas}
            style={{ cursor: toolCursor }}
            onMouseDown={handlePointerDown}
            onMouseMove={handlePointerMove}
            onMouseUp={handlePointerUp}
            onMouseLeave={handlePointerUp}
            onTouchStart={handlePointerDown}
            onTouchMove={handlePointerMove}
            onTouchEnd={handlePointerUp}
          />
        </div>
      </div>

      {/* Bottom bar */}
      <div className={styles.bottomBar}>
        <button className={styles.cancelBtn} onClick={onClose}>
          Cancel
        </button>
        <button className={styles.saveBtn} onClick={handleSave}>
          <Save size={15} /> {src ? "Save Changes" : "Use Drawing"}
        </button>
      </div>
    </div>,
    document.body,
  );
}
