"use client";

import {
  Type,
  Image,
  Volume2,
  Video,
  FileText as DocIcon,
  Hash,
} from "lucide-react";
import { TooltipComponent } from "@rodrigo-barraza/components";
import { MODALITY_COLORS } from "./WorkflowNodeConstants";
import styles from "./ModalityIconComponent.module.css";

/**
 * INPUT_MODALITIES / OUTPUT_MODALITIES — data-driven icon definitions
 * for input and output modality badges. Modalities only — no tools.
 */
const INPUT_MODALITIES = [
  { key: "textIn", label: "Text input", icon: Type, color: MODALITY_COLORS.text },
  { key: "imageIn", label: "Image input", icon: Image, color: MODALITY_COLORS.image },
  { key: "audioIn", label: "Audio input", icon: Volume2, color: MODALITY_COLORS.audio },
  { key: "videoIn", label: "Video input", icon: Video, color: MODALITY_COLORS.video },
  { key: "docIn", label: "Document input", icon: DocIcon, color: MODALITY_COLORS.pdf },
];

const OUTPUT_MODALITIES = [
  { key: "textOut", label: "Text output", icon: Type, color: MODALITY_COLORS.text },
  { key: "imageOut", label: "Image output", icon: Image, color: MODALITY_COLORS.image },
  { key: "audioOut", label: "Audio output", icon: Volume2, color: MODALITY_COLORS.audio },
  { key: "embeddingOut", label: "Embedding output", icon: Hash, color: MODALITY_COLORS.embedding },
];

/**
 * ModalityIconComponent — renders a compact row of input → output modality
 * icons. Modalities only — tool capabilities are rendered by ModelToolsRow (ToolBadgeComponent).
 *
 * Props:
 *   modalities  — object with boolean keys (textIn, imageIn, textOut, etc.)
 *   size        — icon size in px (default 11)
 *   className   — extra root class name
 */
export default function ModalityIconComponent({
  modalities,
  size = 11,
  className,
}) {
  if (!modalities) return null;

  const activeInputs = INPUT_MODALITIES.filter((m) => modalities[m.key]);
  const activeOutputs = OUTPUT_MODALITIES.filter((m) => modalities[m.key]);
  const hasInputs = activeInputs.length > 0;
  const hasOutputs = activeOutputs.length > 0;

  if (!hasInputs && !hasOutputs) return null;

  const renderIcon = (def) => (
    <TooltipComponent key={def.key} label={def.label} position="top">
      <span className={styles.modalityIcon} style={{ color: def.color }}>
        <def.icon size={size} />
      </span>
    </TooltipComponent>
  );

  return (
    <div className={`${styles.modalitiesRow} ${className || ""}`}>
      <span className={styles.modalityBadge}>
        {activeInputs.map(renderIcon)}
        {hasInputs && hasOutputs && (
          <span className={styles.modalityArrow}>→</span>
        )}
        {activeOutputs.map(renderIcon)}
      </span>
    </div>
  );
}
