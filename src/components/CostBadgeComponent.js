import { Coins } from "lucide-react";
import { formatCost } from "../utils/utilities";
import styles from "./CostBadgeComponent.module.css";

/**
 * CostBadgeComponent — green-tinted cost pill with optional icon.
 *
 * @param {number} cost — dollar amount
 * @param {boolean} [showIcon=true] — show Coins icon
 * @param {string} [className]
 */
export default function CostBadgeComponent({
  cost,
  showIcon = true,
  className = "",
  mini = false,
}) {
  if (!cost || cost <= 0) return null;
  return (
    <span className={`${styles.badge} ${mini ? styles.mini : ""} ${className}`}>
      {showIcon && <Coins size={mini ? 8 : 10} />}
      {formatCost(cost)}
    </span>
  );
}
