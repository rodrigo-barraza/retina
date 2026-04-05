"use client";

import { useRef, useEffect, useCallback } from "react";
import styles from "./TextAreaComponent.module.css";

/**
 * TextAreaComponent — Reusable auto-resizing textarea with consistent styling.
 *
 * @param {string}   value       — Current value
 * @param {Function} onChange    — (e) => void
 * @param {string}   [placeholder] — Placeholder text
 * @param {number}   [minRows=3]  — Minimum visible rows
 * @param {number}   [maxRows=12] — Maximum visible rows before scrolling
 * @param {boolean}  [autoResize=true] — Auto-grow to content
 * @param {boolean}  [disabled=false]
 * @param {boolean}  [readOnly=false]
 * @param {string}   [className] — Additional class
 * @param {string}   [id]       — Element ID for accessibility
 */
export default function TextAreaComponent({
  value,
  onChange,
  placeholder,
  minRows = 3,
  maxRows = 12,
  autoResize = true,
  disabled = false,
  readOnly = false,
  className,
  id,
  ...rest
}) {
  const ref = useRef(null);

  const resize = useCallback(() => {
    const el = ref.current;
    if (!el || !autoResize) return;

    // Reset to single row to measure scrollHeight accurately
    el.style.height = "auto";
    const lineHeight = parseFloat(getComputedStyle(el).lineHeight) || 20;
    const minHeight = lineHeight * minRows + 20; // 20 = padding
    const maxHeight = lineHeight * maxRows + 20;
    const scrollH = el.scrollHeight;

    el.style.height = `${Math.min(Math.max(scrollH, minHeight), maxHeight)}px`;
  }, [autoResize, minRows, maxRows]);

  // Resize on value change
  useEffect(() => {
    resize();
  }, [value, resize]);

  // Resize on mount
  useEffect(() => {
    resize();
  }, [resize]);

  const handleChange = (e) => {
    onChange?.(e);
  };

  const classes = [styles.textarea, className || ""].filter(Boolean).join(" ");

  return (
    <textarea
      ref={ref}
      id={id}
      className={classes}
      value={value}
      onChange={handleChange}
      placeholder={placeholder}
      disabled={disabled}
      readOnly={readOnly}
      rows={minRows}
      {...rest}
    />
  );
}
