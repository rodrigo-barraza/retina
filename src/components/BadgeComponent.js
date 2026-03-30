import styles from "./BadgeComponent.module.css";

/**
 * BadgeComponent — standardized inline badge/pill.
 *
 * @param {"provider"|"endpoint"|"modality"|"success"|"error"|"info"|"accent"|"warning"} [variant="info"]
 * @param {React.ReactNode} children
 * @param {string} [className]
 */
export default function BadgeComponent({
  variant = "info",
  children,
  className = "",
  mini = false,
  ...rest
}) {
  return (
    <span
      className={`${styles.badge} ${styles[variant] || ""} ${mini ? styles.mini : ""} ${className}`}
      {...rest}
    >
      {children}
    </span>
  );
}
