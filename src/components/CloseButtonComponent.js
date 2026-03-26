"use client";

import { X } from "lucide-react";
import styles from "./CloseButtonComponent.module.css";

/**
 * CloseButtonComponent — An X-icon dismiss button for modals, drawers, and panels.
 *
 * @param {Function} onClick — Click handler (typically onClose)
 * @param {number} [size=18] — Icon size
 * @param {"default"|"dark"} [variant="default"] — default for modal headers, dark for overlay viewers
 * @param {string} [className] — Additional class
 */
export default function CloseButtonComponent({
  onClick,
  size = 18,
  variant = "default",
  className,
}) {
  const classes = [
    styles.closeBtn,
    variant === "dark" ? styles.dark : "",
    className || "",
  ]
    .filter(Boolean)
    .join(" ");

  return (
    <button className={classes} onClick={onClick} title="Close">
      <X size={size} />
    </button>
  );
}
