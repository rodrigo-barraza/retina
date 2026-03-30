import { Cpu } from "lucide-react";
import TooltipComponent from "./TooltipComponent";
import styles from "./ModelBadgeComponent.module.css";

/**
 * ModelBadgeComponent — displays a single model name or a "N models" badge
 * with a tooltip listing all model names.
 *
 * @param {string[]} models — array of model name strings
 * @param {string} [className]
 */
export default function ModelBadgeComponent({ models = [], className = "" }) {
  if (!models || models.length === 0) {
    return <span style={{ color: "var(--text-muted)" }}>—</span>;
  }

  if (models.length === 1) {
    return (
      <span className={`${styles.badge} ${className}`} title={models[0]}>
        <Cpu size={10} />
        <span className={styles.modelName}>{models[0]}</span>
      </span>
    );
  }

  return (
    <TooltipComponent label={models.join(", ")} position="top">
      <span className={`${styles.badge} ${className}`}>
        <Cpu size={10} />
        {models.length} models
      </span>
    </TooltipComponent>
  );
}
