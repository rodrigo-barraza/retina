"use client";

import { useEffect, useRef, useCallback } from "react";
import { createPortal } from "react-dom";
import styles from "./ModalOverlayComponent.module.css";

/**
 * ModalOverlayComponent — Full-screen backdrop with click-outside and Escape to close.
 *
 * @param {Function} onClose — Called when overlay is clicked or Escape is pressed
 * @param {boolean} [portal=false] — Mount via React Portal on document.body
 * @param {"default"|"dark"} [variant="default"] — Visual style
 * @param {React.ReactNode} children — The modal/viewer content
 * @param {string} [className] — Additional class on the overlay div
 */
export default function ModalOverlayComponent({
  onClose,
  portal = false,
  variant = "default",
  children,
  className,
}) {
  const overlayRef = useRef(null);

  // Close on Escape
  useEffect(() => {
    const handleKey = (e) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", handleKey);
    return () => document.removeEventListener("keydown", handleKey);
  }, [onClose]);

  // Close on overlay click (not children)
  const handleOverlayClick = useCallback(
    (e) => {
      if (e.target === overlayRef.current) onClose();
    },
    [onClose],
  );

  const classes = [
    styles.overlay,
    variant === "dark" ? styles.dark : "",
    className || "",
  ]
    .filter(Boolean)
    .join(" ");

  const content = (
    <div className={classes} ref={overlayRef} onClick={handleOverlayClick}>
      {children}
    </div>
  );

  if (portal && typeof document !== "undefined") {
    return createPortal(content, document.body);
  }

  return content;
}
