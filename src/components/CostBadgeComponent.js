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
}) {
  if (!cost || cost <= 0) return null;
  return (
    <span className={`${styles.badge} ${className}`}>
      {showIcon && <Coins size={10} />}
      {formatCost(cost)}
    </span>
  );
}
