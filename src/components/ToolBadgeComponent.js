"use client";

import React from "react";
import TooltipComponent from "./TooltipComponent";
import { resolveToolVisuals } from "./WorkflowNodeConstants";
import { renderToolName } from "../utils/utilities";
import styles from "./ToolBadgeComponent.module.css";

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
 * Abbreviated display names for the "condensed" variant.
 */
const TOOL_SHORT_NAMES = {
  "Thinking": "Think",
  "Tool Calling": "Tool",
  "Web Search": "Web",
  "Google Search": "Web",
  "Code Execution": "Code",
  "Computer Use": "Computer",
  "File Search": "File",
  "URL Context": "URL",
  "Image Generation": "Image",
};


/**
 * Resolve any tool name to a human-readable display label.
 * @param {string} name  — raw tool function name or canonical name
 * @param {"default"|"compact"|"condensed"} variant
 */
function resolveDisplayName(name, variant = "default") {
  if (variant === "condensed" && TOOL_SHORT_NAMES[name]) return TOOL_SHORT_NAMES[name];
  if (TOOL_DISPLAY_NAMES[name]) return TOOL_DISPLAY_NAMES[name];
  // Fallback: title-case via shared utility
  return renderToolName(name);
}

// ═══════════════════════════════════════════════════════════════════════
// ToolBadgeComponent — THE single badge component used everywhere.
// ═══════════════════════════════════════════════════════════════════════

/**
 * ToolBadgeComponent — renders a single, consistently-styled tool badge.
 *
 * Props:
 *   name    — raw tool function name or canonical name (e.g. "read_file", "Tool Calling")
 *   count   — optional usage count (shown as ×N when > 1)
 *   active  — whether the tool is currently executing (pulses)
 *   variant — "default" (icon+label+count), "compact" (icon+count), "condensed" (icon+short label+count)
 *   tooltip — optional tooltip override (defaults to raw name)
 */
export default function ToolBadgeComponent({
  name,
  count,
  active,
  variant = "default",
  tooltip,
}) {
  const isCompact = variant === "compact";
  const displayName = resolveDisplayName(name, variant);
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
      <Icon size={10} />
      {!isCompact && <span className={styles.label}>{displayName}</span>}
      {count != null && count > 1 && (
        <span className={styles.count}>×{count}</span>
      )}
    </span>
  );

  // Only wrap in tooltip if there's useful extra info beyond what's visible
  if (isCompact || tooltipLabel !== displayName) {
    return (
      <TooltipComponent label={tooltipLabel} position="top">
        {badge}
      </TooltipComponent>
    );
  }

  return badge;
}

/**
 * ToolBadgeRow — renders a row of tool badges from a { toolName: count } map.
 * Used in MessageList for worker tool activity.
 */
export function ToolBadgeRow({ tools, activeTool, variant }) {
  if (!tools || Object.keys(tools).length === 0) return null;

  return (
    <div className={styles.badgeRow}>
      {Object.entries(tools)
        .sort(([, a], [, b]) => b - a)
        .map(([name, count]) => (
          <ToolBadgeComponent key={name} name={name} count={count} active={name === activeTool} variant={variant} />
        ))}
    </div>
  );
}


// ═══════════════════════════════════════════════════════════════════════
// ModelToolsRow — data-driven row of tool-capability badges for models.
// Renders the SAME ToolBadgeComponent — just driven by boolean/numeric
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
 * for a model, using ToolBadgeComponent for each active capability.
 *
 * Props:
 *   tools     — object with boolean/numeric keys (thinking, functionCalling, webSearch, etc.)
 *   variant   — "default" | "compact" | "condensed"
 *   className — extra root class name
 */
export function ModelToolsRow({
  tools,
  variant,
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
          <ToolBadgeComponent
            key={def.key}
            name={def.name}
            count={count}
            variant={variant}
          />
        );
      })}
    </div>
  );
}
