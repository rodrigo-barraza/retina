"use client";

import { useRef, useState, useEffect, useCallback } from "react";
import { Cpu, Bot, Layers } from "lucide-react";
import styles from "./BenchmarkModeSelector.module.css";

/**
 * Benchmark Mode — the three ways to run a benchmark.
 *
 * "model"    → Model Benchmark — raw model output, no agentic loop
 * "agent"    → Agent Benchmark — agentic loop with tools, turns, thinking
 * "combined" → Combined Benchmark — both model + agent targets in one run
 */
export const BENCHMARK_MODES = [
  { value: "model",    label: "Model",    icon: Cpu,    description: "Raw model inference — no tools or agentic loop" },
  { value: "agent",    label: "Agent",    icon: Bot,    description: "Agentic loop — tools, thinking, multi-turn" },
  { value: "combined", label: "Combined", icon: Layers, description: "Both model and agent targets in one run" },
];

/**
 * BenchmarkModeSelector — Segmented control for picking the benchmark mode.
 *
 * @param {string}   value    — Current mode ("model" | "agent" | "combined")
 * @param {Function} onChange — (mode) => void
 */
export default function BenchmarkModeSelector({ value, onChange }) {
  const containerRef = useRef(null);
  const [pillStyle, setPillStyle] = useState({});

  const updatePill = useCallback(() => {
    if (!containerRef.current) return;
    const idx = BENCHMARK_MODES.findIndex((m) => m.value === value);
    const buttons = containerRef.current.querySelectorAll(`.${styles.option}`);
    if (!buttons[idx]) return;

    const containerRect = containerRef.current.getBoundingClientRect();
    const btnRect = buttons[idx].getBoundingClientRect();

    setPillStyle({
      transform: `translateX(${btnRect.left - containerRect.left}px)`,
      width: `${btnRect.width}px`,
    });
  }, [value]);

  useEffect(() => {
    updatePill();
    window.addEventListener("resize", updatePill);
    return () => window.removeEventListener("resize", updatePill);
  }, [updatePill]);

  const activeMode = BENCHMARK_MODES.find((m) => m.value === value);

  return (
    <div className={styles.wrapper}>
      <div className={styles.container} ref={containerRef}>
        <div className={styles.pill} style={pillStyle} />
        {BENCHMARK_MODES.map((mode) => {
          const Icon = mode.icon;
          const isActive = mode.value === value;
          return (
            <button
              key={mode.value}
              type="button"
              className={`${styles.option} ${isActive ? styles.active : ""}`}
              onClick={() => onChange(mode.value)}
              title={mode.description}
            >
              <Icon size={13} />
              <span>{mode.label}</span>
            </button>
          );
        })}
      </div>
      {activeMode && (
        <div className={styles.description}>{activeMode.description}</div>
      )}
    </div>
  );
}
