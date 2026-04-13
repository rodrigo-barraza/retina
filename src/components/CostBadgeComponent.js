import { useEffect, useState, memo } from "react";
import { Coins } from "lucide-react";
import { formatCost } from "../utils/utilities";
import styles from "./CostBadgeComponent.module.css";

/**
 * RollingDigit — single odometer column that slides between 0–9.
 * Uses translateY on a strip of stacked digits for GPU-accelerated animation.
 */
const RollingDigit = memo(function RollingDigit({ digit, delay, animate }) {
  return (
    <span className={styles.digitSlot}>
      <span
        className={`${styles.digitStrip} ${animate ? styles.animated : ""}`}
        style={{
          transform: `translateY(${-digit}em)`,
          transitionDelay: animate ? `${delay}ms` : "0ms",
        }}
      >
        {[0, 1, 2, 3, 4, 5, 6, 7, 8, 9].map((n) => (
          <span key={n} className={styles.digitCell} aria-hidden={n !== digit}>
            {n}
          </span>
        ))}
      </span>
    </span>
  );
});

/**
 * RollingCost — renders a cost string with odometer-rolling digits.
 * Static characters ($, .) render inline; numeric digits roll.
 *
 * On first mount, digits snap to position (no transition).
 * After mount, transitions are enabled so future value changes
 * animate smoothly.
 */
function RollingCost({ value }) {
  const [animate, setAnimate] = useState(false);

  useEffect(() => {
    // Wait two frames: first to paint digits at initial position,
    // second to ensure browser has committed the layout.
    // Then enable CSS transitions for all future updates.
    const raf = requestAnimationFrame(() => {
      requestAnimationFrame(() => setAnimate(true));
    });
    return () => cancelAnimationFrame(raf);
  }, []);

  const chars = value.split("");

  return (
    <span className={styles.rollingWrap}>
      {chars.map((ch, i) => {
        const n = parseInt(ch, 10);
        if (isNaN(n)) {
          return (
            <span key={i} className={styles.staticChar}>
              {ch}
            </span>
          );
        }
        // Stagger right → left so least-significant digit moves first
        const digitIndex = chars.length - 1 - i;
        const delay = digitIndex * 30;
        return (
          <RollingDigit key={i} digit={n} delay={delay} animate={animate} />
        );
      })}
    </span>
  );
}

/**
 * CostBadgeComponent — green-tinted cost pill with optional icon.
 * When already mounted and cost updates, digits roll (odometer effect).
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
  if (!cost || cost <= 0) return null;

  const formatted = formatCost(cost);

  return (
    <span className={`${styles.badge} ${mini ? styles.mini : ""} ${className}`}>
      {showIcon && <Coins size={mini ? 8 : 10} />}
      <RollingCost value={formatted} />
    </span>
  );
}
