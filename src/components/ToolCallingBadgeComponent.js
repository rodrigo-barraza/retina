"use client";

import React from "react";
import {
  Wrench,
} from "lucide-react";
import TooltipComponent from "./TooltipComponent";
import { TOOL_ICON_MAP, TOOL_COLORS } from "./WorkflowNodeConstants";
import styles from "./ToolCallingBadgeComponent.module.css";

// ═══════════════════════════════════════════════════════════════════════
// Canonical tool display names — single source of truth for labels.
// ═══════════════════════════════════════════════════════════════════════

/**
 * Map raw tool function names (snake_case) AND canonical tool names
 * to a consistent display label.
 */
const TOOL_DISPLAY_NAMES = {
  // ── Canonical capability names ──
  "Tool Calling": "Tool Calling",
  "Thinking": "Thinking",
  "Web Search": "Web Search",
  "Google Search": "Web Search",
  "Code Execution": "Code Execution",
  "Computer Use": "Computer Use",
  "File Search": "File Search",
  "URL Context": "URL Context",
  "Image Generation": "Image Gen",
};

/**
 * Resolve a tool name to its icon and color.
 */
function resolveToolVisuals(name) {
  if (TOOL_ICON_MAP[name]) {
    return { Icon: TOOL_ICON_MAP[name], color: TOOL_COLORS[name] || "#f59e0b" };
  }
  return {
    Icon: TOOL_ICON_MAP["Tool Calling"] || Wrench,
    color: TOOL_COLORS["Tool Calling"] || "#f97316",
  };
}

/**
 * Resolve any tool name to a human-readable display label.
 */
function resolveDisplayName(name) {
  if (TOOL_DISPLAY_NAMES[name]) return TOOL_DISPLAY_NAMES[name];
  // Fallback: strip prefixes and title-case
  return name
    .replace(/^(get_|mcp__\w+__)/, "")
    .replace(/_/g, " ")
    .replace(/\b\w/g, (c) => c.toUpperCase());
}

// ═══════════════════════════════════════════════════════════════════════
// ToolCallingBadgeComponent — THE single badge component used everywhere.
// ═══════════════════════════════════════════════════════════════════════

/**
 * ToolCallingBadgeComponent — renders a single, consistently-styled tool-calling badge.
 *
 * Props:
 *   name    — raw tool function name or canonical name (e.g. "read_file", "Tool Calling")
 *   count   — optional usage count (shown as ×N when > 1)
 *   active  — whether the tool is currently executing (pulses)
 *   size    — icon size in px (default 11)
 *   tooltip — optional tooltip override (defaults to raw name)
 */
export default function ToolCallingBadgeComponent({
  name,
  count,
  active,
  size = 11,
  tooltip,
}) {
  const displayName = resolveDisplayName(name);
  const { Icon, color } = resolveToolVisuals(name);
  const tooltipLabel = tooltip || name;

  const badge = (
    <span
      className={`${styles.badge}${active ? ` ${styles.badgeActive}` : ""}`}
      style={{
        color,
        borderColor: `color-mix(in srgb, ${color} 30%, transparent)`,
      }}
    >
      <Icon size={size} />
      <span className={styles.label}>{displayName}</span>
      {count != null && count > 1 && (
        <span className={styles.count}>×{count}</span>
      )}
    </span>
  );

  // Only wrap in tooltip if there's useful extra info beyond what's visible
  if (tooltipLabel !== displayName) {
    return (
      <TooltipComponent label={tooltipLabel} position="top">
        {badge}
      </TooltipComponent>
    );
  }

  return badge;
}

/**
 * ToolCallingBadgeRow — renders a row of tool-calling badges from a { toolName: count } map.
 * Used in MessageList for worker tool activity.
 */
export function ToolCallingBadgeRow({ tools, activeTool }) {
  if (!tools || Object.keys(tools).length === 0) return null;

  return (
    <div className={styles.badgeRow}>
      {Object.entries(tools)
        .sort(([, a], [, b]) => b - a)
        .map(([name, count]) => (
          <ToolCallingBadgeComponent key={name} name={name} count={count} active={name === activeTool} />
        ))}
    </div>
  );
}


// ═══════════════════════════════════════════════════════════════════════
// ModelToolsRow — data-driven row of tool-capability badges for models.
// Renders the SAME ToolCallingBadgeComponent — just driven by boolean/numeric
// capability keys from the model definition.
// ═══════════════════════════════════════════════════════════════════════

/**
 * TOOL_DEFS — maps boolean capability keys to their canonical tool names.
 */
const TOOL_DEFS = [
  { key: "thinking", name: "Thinking" },
  { key: "functionCalling", name: "Tool Calling" },
  { key: "webSearch", name: "Web Search" },
  { key: "codeExecution", name: "Code Execution" },
  { key: "computerUse", name: "Computer Use" },
  { key: "fileSearch", name: "File Search" },
  { key: "urlContext", name: "URL Context" },
  { key: "imageGeneration", name: "Image Generation" },
];

/**
 * ModelToolsRow — renders a compact row of tool-capability badges
 * for a model, using ToolCallingBadgeComponent for each active capability.
 *
 * Props:
 *   tools     — object with boolean/numeric keys (thinking, functionCalling, webSearch, etc.)
 *   size      — icon size in px (default 11)
 *   className — extra root class name
 */
export function ModelToolsRow({
  tools,
  size = 11,
  className,
}) {
  if (!tools) return null;

  const activeTools = TOOL_DEFS.filter((t) => tools[t.key]);
  if (activeTools.length === 0) return null;

  return (
    <div className={`${styles.badgeRow} ${className || ""}`}>
      {activeTools.map((def) => {
        const raw = tools[def.key];
        const count = typeof raw === "number" ? raw : 0;

        return (
          <ToolCallingBadgeComponent
            key={def.key}
            name={def.name}
            count={count}
            size={size}
          />
        );
      })}
    </div>
  );
}
