"use client";

import { useRef, useEffect, useCallback } from "react";
import { parseGIF, decompressFrames } from "gifuct-js";
import styles from "./SpinningCatComponent.module.css";

/**
 * SpinningCatComponent — Shows cat.gif (static) by default.
 * During image generation, switches to a canvas-rendered cat-spinning.gif
 * with quadratic speed acceleration (starts at ~20% speed, ramps up).
 *
 * Props:
 *   animate  – whether the cat is spinning (default false)
 *   className – optional extra class
 */

const BASE_SPEED = 0.2;        // Start at 20% of original GIF speed
const ACCEL_COEFFICIENT = 0.08; // Quadratic ramp: speedMultiplier = BASE_SPEED + ACCEL × t²
const DECEL_SMOOTHING = 0.03;  // Exponential decay back to base when stopping

function renderFrame(canvas, patchCanvas, frames, index) {
  if (!canvas || !patchCanvas || !frames?.length) return;

  const ctx = canvas.getContext("2d");
  const frame = frames[index];
  if (!frame) return;

  const { dims, patch: pixels } = frame;

  const patchCtx = patchCanvas.getContext("2d");
  const imageData = patchCtx.createImageData(dims.width, dims.height);
  imageData.data.set(pixels);
  patchCtx.putImageData(imageData, 0, 0);

  if (frame.disposalType === 2) {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
  }

  ctx.drawImage(
    patchCanvas,
    0, 0, dims.width, dims.height,
    dims.left, dims.top, dims.width, dims.height,
  );
}

export default function SpinningCatComponent({
  animate = false,
  className = "",
}) {
  const canvasRef = useRef(null);
  const framesRef = useRef(null);
  const patchRef = useRef(null);
  const rafRef = useRef(null);
  const stateRef = useRef({
    frameIndex: 0,
    elapsed: 0,        // ms accumulated toward next frame
    accelTime: 0,       // seconds since animation started (for quadratic ramp)
    speedMultiplier: BASE_SPEED,
    lastTimestamp: 0,
  });
  const animateRef = useRef(animate);

  useEffect(() => { animateRef.current = animate; }, [animate]);

  // ── Decode the spinning GIF on mount ─────────────────────────
  useEffect(() => {
    let cancelled = false;

    (async () => {
      try {
        const res = await fetch("/cat-spinning.gif");
        const buffer = await res.arrayBuffer();
        const gif = parseGIF(buffer);
        const frames = decompressFrames(gif, true);
        if (cancelled) return;
        framesRef.current = frames;

        const canvas = canvasRef.current;
        if (canvas && frames.length > 0) {
          canvas.width = frames[0].dims.width;
          canvas.height = frames[0].dims.height;

          const patch = document.createElement("canvas");
          patch.width = canvas.width;
          patch.height = canvas.height;
          patchRef.current = patch;

          // Draw frame 0 so canvas isn't blank
          renderFrame(canvas, patch, frames, 0);
        }
      } catch (err) {
        console.error("SpinningCatComponent: failed to decode GIF", err);
      }
    })();

    return () => { cancelled = true; };
  }, []);

  // ── Main animation loop (always running, speed-controlled) ───
  const tick = useCallback((now) => {
    const frames = framesRef.current;
    if (!frames?.length) {
      rafRef.current = requestAnimationFrame(tick);
      return;
    }

    const s = stateRef.current;
    if (!s.lastTimestamp) s.lastTimestamp = now;
    const dt = now - s.lastTimestamp;
    s.lastTimestamp = now;

    if (animateRef.current) {
      // Accelerating: quadratic ramp from BASE_SPEED
      s.accelTime += dt / 1000;
      s.speedMultiplier = BASE_SPEED + ACCEL_COEFFICIENT * s.accelTime * s.accelTime;
    } else if (s.speedMultiplier > BASE_SPEED + 0.01) {
      // Decelerating: smooth exponential decay back to base
      s.accelTime = 0;
      const smoothing = 1 - Math.pow(1 - DECEL_SMOOTHING, dt / 16.67);
      s.speedMultiplier += (BASE_SPEED - s.speedMultiplier) * smoothing;
    } else {
      s.speedMultiplier = BASE_SPEED;
      s.accelTime = 0;
    }

    const frame = frames[s.frameIndex];
    const baseDelay = frame?.delay || 100;
    // Effective delay = original delay / speed multiplier
    const effectiveDelay = baseDelay / s.speedMultiplier;

    s.elapsed += dt;

    if (s.elapsed >= effectiveDelay) {
      s.elapsed = 0;
      s.frameIndex = (s.frameIndex + 1) % frames.length;

      // On wrap-around, clear for proper compositing
      if (s.frameIndex === 0) {
        const canvas = canvasRef.current;
        if (canvas) {
          const ctx = canvas.getContext("2d");
          ctx.clearRect(0, 0, canvas.width, canvas.height);
        }
      }

      renderFrame(canvasRef.current, patchRef.current, frames, s.frameIndex);
    }

    rafRef.current = requestAnimationFrame(tick);
  }, []);

  useEffect(() => {
    rafRef.current = requestAnimationFrame(tick);
    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    };
  }, [tick]);

  return (
    <div className={`${styles.wrapper} ${className}`}>
      {/* Static cat — visible when NOT animating */}
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src="/cat.gif"
        alt="Cat"
        className={`${styles.staticCat} ${animate ? styles.hidden : ""}`}
      />
      {/* Spinning cat canvas — visible when animating */}
      <canvas
        ref={canvasRef}
        className={`${styles.canvas} ${animate ? "" : styles.hidden}`}
      />
    </div>
  );
}
