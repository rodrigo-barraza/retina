"use client";

import { useState, useCallback } from "react";
import { Copy, Check } from "lucide-react";
import styles from "./CopyButtonComponent.module.css";

/**
 * CopyButtonComponent
 *
 * Standardized copy-to-clipboard button with a "copied" confirmation state.
 * Supports icon-only mode or icon + label mode.
 *
 * @param {object}  props
 * @param {string}  props.text          — The text to copy to clipboard
 * @param {number}  [props.size=14]     — Icon size
 * @param {boolean} [props.showLabel]   — Show "Copy" / "Copied" text label
 * @param {string}  [props.className]   — Additional class name
 * @param {string}  [props.tooltip]     — Tooltip text (used with title attr)
 */
export default function CopyButtonComponent({
  text,
  size = 14,
  showLabel = false,
  className = "",
  tooltip = "Copy",
}) {
  const [copied, setCopied] = useState(false);

  const handleCopy = useCallback(
    async (e) => {
      e.stopPropagation();
      try {
        await navigator.clipboard.writeText(text);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
      } catch {
        // clipboard API unavailable
      }
    },
    [text],
  );

  return (
    <button
      type="button"
      className={`${styles.copyButton} ${copied ? styles.copied : ""} ${className}`}
      onClick={handleCopy}
      title={copied ? "Copied!" : tooltip}
    >
      {copied ? <Check size={size} /> : <Copy size={size} />}
      {showLabel && (copied ? "Copied" : "Copy")}
    </button>
  );
}
