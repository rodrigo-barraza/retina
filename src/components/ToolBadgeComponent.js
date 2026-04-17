"use client";

import React from "react";
import {
  Brain,
  Parentheses,
  Globe,
  Terminal,
  Monitor,
  Search as SearchIcon,
  Link,
  ImagePlus,
  Wrench,
} from "lucide-react";
import TooltipComponent from "./TooltipComponent";
import { MODALITY_COLORS, TOOL_ICON_MAP, TOOL_COLORS } from "./WorkflowNodeConstants";
import styles from "./ToolBadgeComponent.module.css";

/**
 * Map raw tool function names (snake_case) to human-friendly display names.
 */
const TOOL_DISPLAY_NAMES = {
  read_file: "Read",
  write_file: "Write",
  str_replace: "Replace",
  grep_search: "Grep",
  glob_files: "Glob",
  list_directory: "List Dir",
  web_search: "Web Search",
  fetch_url: "Fetch",
  execute_shell: "Shell",
  execute_python: "Python",
  execute_javascript: "JS",
  git_status: "Git Status",
  git_diff: "Git Diff",
  git_log: "Git Log",
  delete_file: "Delete",
  move_file: "Move",
  browser_action: "Browser",
  project_summary: "Summary",
  generate_image: "Image Gen",
};

/**
 * Resolve the icon and color for a raw tool name.
 */
function resolveToolVisuals(rawName) {
  if (TOOL_ICON_MAP[rawName]) {
    return { Icon: TOOL_ICON_MAP[rawName], color: TOOL_COLORS[rawName] || "#f59e0b" };
  }
  return {
    Icon: TOOL_ICON_MAP["Tool Calling"] || Wrench,
    color: TOOL_COLORS["Tool Calling"] || "#f97316",
  };
}

/**
 * Compact tool badge showing icon + short name.
 * For inline use in message lists, worker activity, etc.
 *
 * @param {object} props
 * @param {string} props.name - Raw tool function name (e.g. "read_file")
 * @param {number} [props.count] - Optional usage count
 * @param {boolean} [props.active] - Whether the tool is currently executing
 */
export default function ToolBadgeComponent({ name, count, active }) {
  const displayName = TOOL_DISPLAY_NAMES[name]
    || name.replace(/^(get_|mcp__\w+__)/, "").replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
  const { Icon, color } = resolveToolVisuals(name);

  return (
    <span className={`${styles.badge}${active ? ` ${styles.badgeActive}` : ""}`} title={name}>
      <Icon size={10} style={{ color }} />
      <span>{displayName}</span>
      {count != null && count > 1 && (
        <span className={styles.count}>×{count}</span>
      )}
    </span>
  );
}

/**
 * Row of tool badges from a Map/Object of toolName → count.
 *
 * @param {object} props
 * @param {Object<string, number>} props.tools - { toolName: count }
 */
export function ToolBadgeRow({ tools, activeTool }) {
  if (!tools || Object.keys(tools).length === 0) return null;

  return (
    <div className={styles.badgeRow}>
      {Object.entries(tools)
        .sort(([, a], [, b]) => b - a)
        .map(([name, count]) => (
          <ToolBadgeComponent key={name} name={name} count={count} active={name === activeTool} />
        ))}
    </div>
  );
}


// ═══════════════════════════════════════════════════════════════════════
// ModelToolsRow — data-driven row of tool-capability badges for a model.
// Replaces the former ModelToolsComponent.
// ═══════════════════════════════════════════════════════════════════════

/**
 * TOOL_DEFS — data-driven icon definitions for model tool capabilities.
 * Each entry maps a boolean key from the modalities object to a
 * lucide icon, tooltip label, and color.
 */
const TOOL_DEFS = [
  { key: "thinking", label: "Thinking", icon: Brain, color: MODALITY_COLORS.thinking },
  { key: "functionCalling", label: "Tool Calling", icon: Parentheses, color: TOOL_COLORS["Tool Calling"] },
  { key: "webSearch", label: "Web Search", icon: Globe, color: MODALITY_COLORS.webSearch },
  { key: "codeExecution", label: "Code Execution", icon: Terminal, color: MODALITY_COLORS.codeExecution },
  { key: "computerUse", label: "Computer Use", icon: Monitor, color: TOOL_COLORS["Computer Use"] },
  { key: "fileSearch", label: "File Search", icon: SearchIcon, color: TOOL_COLORS["File Search"] },
  { key: "urlContext", label: "URL Context", icon: Link, color: TOOL_COLORS["URL Context"] },
  { key: "imageGeneration", label: "Image Generation", icon: ImagePlus, color: TOOL_COLORS["Image Generation"] },
];

/**
 * ModelToolsRow — renders a compact row of tool-capability badges
 * for a model. Separated from ModalityIconComponent which handles
 * input/output modalities exclusively.
 *
 * Props:
 *   tools       — object with boolean/numeric keys (thinking, functionCalling, webSearch, etc.)
 *                 Boolean true or 1 = shows icon only.
 *                 Number > 1 = shows icon + usage count.
 *   size        — icon size in px (default 11)
 *   className   — extra root class name
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
    <div className={`${styles.toolsRow} ${className || ""}`}>
      {activeTools.map((def) => {
        const raw = tools[def.key];
        const count = typeof raw === "number" ? raw : 0;
        const tooltipLabel = count > 1 ? `${def.label} — ×${count}` : def.label;

        return (
          <TooltipComponent key={def.key} label={tooltipLabel} position="top">
            <span
              className={styles.toolBadge}
              style={{
                color: def.color,
                borderColor: `color-mix(in srgb, ${def.color} 30%, transparent)`,
              }}
            >
              <def.icon size={size} />
              {count > 1 && (
                <span className={styles.toolCount}>×{count}</span>
              )}
            </span>
          </TooltipComponent>
        );
      })}
    </div>
  );
}
