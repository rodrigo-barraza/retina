"use client";

import { Search, X } from "lucide-react";
import styles from "./SearchInputComponent.module.css";

/**
 * SearchInputComponent — A search input with icon and optional clear button.
 *
 * @param {string} value — Current search value
 * @param {Function} onChange — (value: string) => void
 * @param {string} [placeholder="Search…"] — Placeholder text
 * @param {boolean} [autoFocus=false] — Auto-focus on mount
 * @param {string} [className] — Additional class on the wrapper
 */
export default function SearchInputComponent({
  value,
  onChange,
  placeholder = "Search…",
  autoFocus = false,
  className,
}) {
  return (
    <div
      className={`${styles.searchWrapper}${className ? ` ${className}` : ""}`}
    >
      <Search size={14} className={styles.searchIcon} />
      <input
        type="text"
        className={styles.searchInput}
        placeholder={placeholder}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        autoFocus={autoFocus}
      />
      {value && (
        <button
          className={styles.searchClear}
          onClick={() => onChange("")}
          type="button"
        >
          <X size={14} />
        </button>
      )}
    </div>
  );
}
