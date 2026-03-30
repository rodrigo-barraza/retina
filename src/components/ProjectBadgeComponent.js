import styles from "./ProjectBadgeComponent.module.css";

/**
 * ProjectBadgeComponent — accent-colored project tag.
 *
 * @param {string} project — project name to display
 * @param {string} [className]
 */
export default function ProjectBadgeComponent({ project, className = "" }) {
  if (!project) return null;
  return (
    <span className={`${styles.badge} ${className}`}>
      {project}
    </span>
  );
}
