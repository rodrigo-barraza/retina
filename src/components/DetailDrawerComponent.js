"use client";

import { X } from "lucide-react";
import styles from "./DetailDrawerComponent.module.css";

/**
 * DetailDrawerComponent — a slide-in drawer for displaying detail views.
 *
 * @param {boolean} open — whether the drawer is visible
 * @param {Function} onClose — callback to close the drawer
 * @param {string} title — drawer header title
 * @param {Array<{title: string, items: Array<{label: string, value: React.ReactNode}>}>} sections
 * @param {React.ReactNode} [children] — additional content rendered after sections
 */
export default function DetailDrawerComponent({
  open,
  onClose,
  title = "Detail",
  sections = [],
  children,
}) {
  if (!open) return null;

  return (
    <>
      <div className={styles.overlay} onClick={onClose} />
      <div className={styles.drawer}>
        <div className={styles.header}>
          <span className={styles.title}>{title}</span>
          <button className={styles.closeBtn} onClick={onClose}>
            <X size={18} />
          </button>
        </div>
        <div className={styles.body}>
          {sections.map((section, si) => (
            <div key={si} className={styles.section}>
              <div className={styles.sectionTitle}>{section.title}</div>
              <div className={styles.grid}>
                {section.items.map((item, ii) => (
                  <div key={ii} className={styles.item}>
                    <span className={styles.label}>{item.label}</span>
                    <span
                      className={`${styles.value} ${item.mono ? styles.mono : ""}`}
                    >
                      {item.value ?? "—"}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          ))}
          {children}
        </div>
      </div>
    </>
  );
}
