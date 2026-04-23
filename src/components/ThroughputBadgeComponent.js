import styles from "./ThroughputBadgeComponent.module.css";

/**
 * ThroughputBadgeComponent — tok/s speed pill for session stats.
 *
 * Three visual states:
 *   - **live** — actively generating, green with pulse animation
 *   - **stale** — held value between tool calls, muted
 *   - **average** — static historical average from completed session
 *
 * During coordinator sessions with active workers, `liveTokPerSec`
 * should be the **additive sum** of all concurrent worker throughputs
 * (e.g. 3 workers × 40 tok/s = 120 tok/s), not the average.
 *
 * @param {number|null} liveTokPerSec — real-time tok/s (null when not streaming)
 * @param {number|null} avgTokPerSec — historical average from backend stats
 * @param {boolean} isActivelyGenerating — true when any model is producing tokens
 * @param {boolean} turnActive — true when a turn is in progress (even during tool calls)
 */
export default function ThroughputBadgeComponent({
  liveTokPerSec,
  avgTokPerSec,
  isActivelyGenerating,
  turnActive,
}) {
  // Live tok/s takes priority over static average
  if (liveTokPerSec !== null) {
    const variant = (isActivelyGenerating || turnActive)
      ? styles.live
      : styles.stale;
    return (
      <span className={`${styles.badge} ${variant}`}>
        ⚡ {liveTokPerSec.toFixed(1)} tok/s
      </span>
    );
  }

  // Fall back to historical average from backend session stats
  if (avgTokPerSec != null) {
    return (
      <span className={`${styles.badge} ${styles.average}`}>
        ⚡ {avgTokPerSec.toFixed(1)} tok/s
      </span>
    );
  }

  return null;
}
