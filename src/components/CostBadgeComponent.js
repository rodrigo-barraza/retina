import { useRef, useEffect, useState } from "react";
import { Coins } from "lucide-react";
import { formatCost } from "../utils/utilities";
import styles from "./CostBadgeComponent.module.css";

/** Duration of the count-up tween in ms. */
const TWEEN_MS = 600;

/** Ease-out cubic — fast start, gentle landing. */
function easeOutCubic(t) {
  return 1 - Math.pow(1 - t, 3);
}

/**
 * CostBadgeComponent — green-tinted cost pill with optional icon.
 * When cost updates upward, the displayed number tweens (counting animation)
 * from the previous value to the new value.
 *
 * @param {number} cost — dollar amount
 * @param {boolean} [showIcon=true] — show Coins icon
 * @param {string} [className]
 * @param {boolean} [mini]
 */
export default function CostBadgeComponent({
  cost,
  showIcon = true,
  className = "",
  mini = false,
}) {
  const prevCostRef = useRef(null);
  const rafRef = useRef(null);
  const [displayCost, setDisplayCost] = useState(cost);

  useEffect(() => {
    const from = prevCostRef.current;
    prevCostRef.current = cost;

    // First mount or no previous value — snap immediately
    if (from === null || from === cost) {
      setDisplayCost(cost);
      return;
    }

    const delta = cost - from;
    const start = performance.now();

    function tick(now) {
      const elapsed = now - start;
      const progress = Math.min(elapsed / TWEEN_MS, 1);
      const eased = easeOutCubic(progress);
      setDisplayCost(from + delta * eased);

      if (progress < 1) {
        rafRef.current = requestAnimationFrame(tick);
      }
    }

    rafRef.current = requestAnimationFrame(tick);

    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    };
  }, [cost]);

  if (!cost || cost <= 0) return null;

  return (
    <span className={`${styles.badge} ${mini ? styles.mini : ""} ${className}`}>
      {showIcon && <Coins size={mini ? 8 : 10} />}
      {formatCost(displayCost)}
    </span>
  );
}
