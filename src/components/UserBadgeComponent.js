import styles from "./UserBadgeComponent.module.css";

/**
 * UserBadgeComponent — amber-colored user/username tag.
 *
 * @param {string} username — username to display
 * @param {string} [className]
 */
export default function UserBadgeComponent({ username, className = "" }) {
  if (!username || username === "unknown") return null;
  return (
    <span className={`${styles.badge} ${className}`}>
      {username}
    </span>
  );
}
