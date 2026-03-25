"use client";

import { useRef, useCallback } from "react";
import styles from "./SliderComponent.module.css";

/**
 * Custom slider styled like the ToggleSwitch — a track bar with a
 * draggable circle knob and a filled region indicating current value.
 *
 *  value     : number
 *  min       : number
 *  max       : number
 *  step      : number
 *  onChange  : (value: number) => void
 *  disabled? : boolean
 */
export default function SliderComponent({
  value,
  min = 0,
  max = 1,
  step = 0.1,
  onChange,
  disabled = false,
}) {
  const trackRef = useRef(null);

  // Calculate percentage for fill & knob position
  const pct = max === min ? 0 : ((value - min) / (max - min)) * 100;

  const clampAndSnap = useCallback(
    (clientX) => {
      const rect = trackRef.current.getBoundingClientRect();
      const ratio = Math.max(
        0,
        Math.min(1, (clientX - rect.left) / rect.width),
      );
      let raw = min + ratio * (max - min);
      // Snap to step
      raw = Math.round(raw / step) * step;
      // Clamp
      raw = Math.max(min, Math.min(max, raw));
      // Fix floating point
      const decimals = (step.toString().split(".")[1] || "").length;
      return parseFloat(raw.toFixed(decimals));
    },
    [min, max, step],
  );

  const handlePointerDown = (e) => {
    if (disabled) return;
    e.preventDefault();
    trackRef.current.setPointerCapture(e.pointerId);
    onChange(clampAndSnap(e.clientX));
  };

  const handlePointerMove = (e) => {
    if (disabled) return;
    if (!trackRef.current.hasPointerCapture(e.pointerId)) return;
    onChange(clampAndSnap(e.clientX));
  };

  const handlePointerUp = (e) => {
    if (trackRef.current.hasPointerCapture(e.pointerId)) {
      trackRef.current.releasePointerCapture(e.pointerId);
    }
  };

  return (
    <div className={`${styles.slider} ${disabled ? styles.disabled : ""}`}>
      <div
        ref={trackRef}
        className={styles.track}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
      >
        <div className={styles.fill} style={{ width: `${pct}%` }} />
        <div className={styles.knob} style={{ left: `${pct}%` }} />
      </div>
    </div>
  );
}
