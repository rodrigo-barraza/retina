"use client";

import styles from "./SectionHeaderComponent.module.css";

/**
 * SectionHeaderComponent — A panel section divider with optional icon and action.
 *
 * @param {React.ReactNode} [icon] — Leading icon element
 * @param {React.ReactNode} children — Section title text
 * @param {React.ReactNode} [action] — Right-aligned action element
 * @param {string} [className] — Additional class
 */
export default function SectionHeaderComponent({
  icon,
  children,
  action,
  className,
}) {
  return (
    <div
      className={`${styles.sectionHeader}${className ? ` ${className}` : ""}`}
    >
      {icon}
      {children}
      {action && <div className={styles.action}>{action}</div>}
    </div>
  );
}
