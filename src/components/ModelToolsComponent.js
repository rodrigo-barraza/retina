"use client";

import {
  Brain,
  Parentheses,
  Globe,
  Terminal,
  Monitor,
  Search as SearchIcon,
  Link,
  ImagePlus,
} from "lucide-react";
import TooltipComponent from "./TooltipComponent";
import { MODALITY_COLORS, TOOL_COLORS } from "./WorkflowNodeConstants";
import styles from "./ModelToolsComponent.module.css";

/**
 * TOOL_DEFS — data-driven icon definitions for model tool capabilities.
 * Each entry maps a boolean key from the modalities object to a
 * lucide icon, tooltip label, and color.
 */
const TOOL_DEFS = [
  { key: "thinking", label: "Thinking", icon: Brain, color: MODALITY_COLORS.thinking },
  { key: "functionCalling", label: "Function Calling", icon: Parentheses, color: TOOL_COLORS["Function Calling"] },
  { key: "webSearch", label: "Web Search", icon: Globe, color: MODALITY_COLORS.webSearch },
  { key: "codeExecution", label: "Code Execution", icon: Terminal, color: MODALITY_COLORS.codeExecution },
  { key: "computerUse", label: "Computer Use", icon: Monitor, color: TOOL_COLORS["Computer Use"] },
  { key: "fileSearch", label: "File Search", icon: SearchIcon, color: TOOL_COLORS["File Search"] },
  { key: "urlContext", label: "URL Context", icon: Link, color: TOOL_COLORS["URL Context"] },
  { key: "imageGeneration", label: "Image Generation", icon: ImagePlus, color: TOOL_COLORS["Image Generation"] },
];

/**
 * ModelToolsComponent — renders a compact row of tool-capability badges
 * for a model. Separated from ModalityIconComponent which handles
 * input/output modalities exclusively.
 *
 * Props:
 *   tools       — object with boolean keys (thinking, functionCalling, webSearch, etc.)
 *   size        — icon size in px (default 11)
 *   className   — extra root class name
 */
export default function ModelToolsComponent({
  tools,
  size = 11,
  className,
}) {
  if (!tools) return null;

  const activeTools = TOOL_DEFS.filter((t) => tools[t.key]);
  if (activeTools.length === 0) return null;

  return (
    <div className={`${styles.toolsRow} ${className || ""}`}>
      {activeTools.map((def) => (
        <TooltipComponent key={def.key} label={def.label} position="top">
          <span
            className={styles.toolBadge}
            style={{
              color: def.color,
              borderColor: `color-mix(in srgb, ${def.color} 30%, transparent)`,
            }}
          >
            <def.icon size={size} />
          </span>
        </TooltipComponent>
      ))}
    </div>
  );
}
