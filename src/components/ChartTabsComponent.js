"use client";

import styles from "./ChartTabsComponent.module.css";

/**
 * ChartTabsComponent — reusable segmented tab control for chart headers.
 *
 * Props:
 *   tabs      — array of { key, label, color? }
 *   activeTab — current active tab key
 *   onChange  — (key) => void
 */
export default function ChartTabsComponent({ tabs = [], activeTab, onChange }) {
  return (
    <div className={styles.tabs}>
      {tabs.map((tab) => (
        <button
          key={tab.key}
          type="button"
          className={`${styles.tab} ${activeTab === tab.key ? styles.tabActive : ""}`}
          onClick={() => onChange(tab.key)}
          style={
            activeTab === tab.key && tab.color
              ? { color: tab.color, borderColor: tab.color }
              : undefined
          }
        >
          {tab.label}
        </button>
      ))}
    </div>
  );
}
