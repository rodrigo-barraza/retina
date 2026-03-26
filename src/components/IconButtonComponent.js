"use client";

import styles from "./IconButtonComponent.module.css";

/**
 * IconButtonComponent — A small icon-only action button.
 *
 * @param {React.ReactNode} icon — The icon element (e.g. <Copy size={14} />)
 * @param {Function} onClick — Click handler
 * @param {string} [tooltip] — Native title tooltip
 * @param {"default"|"danger"} [variant="default"] — Button variant
 * @param {boolean} [active=false] — Active/pressed state
 * @param {boolean} [hoverReveal=false] — Hidden until parent :hover
 * @param {boolean} [disabled=false] — Disabled state
 * @param {string} [className] — Additional class
 */
export default function IconButtonComponent({
  icon,
  onClick,
  tooltip,
  variant = "default",
  active = false,
  hoverReveal = false,
  disabled = false,
  className,
  ...rest
}) {
  const classes = [
    styles.iconButton,
    variant === "danger" ? styles.danger : "",
    active ? styles.active : "",
    hoverReveal ? styles.hoverReveal : "",
    className || "",
  ]
    .filter(Boolean)
    .join(" ");

  return (
    <button
      className={classes}
      onClick={onClick}
      title={tooltip}
      disabled={disabled}
      {...rest}
    >
      {icon}
    </button>
  );
}
