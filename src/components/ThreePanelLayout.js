"use client";

import { useState } from "react";
import { Settings, History } from "lucide-react";
import styles from "./ThreePanelLayout.module.css";

/**
 * Reusable 3-panel layout with animated sidebars and header toggle buttons.
 *
 * Props:
 *   leftPanel      — React node for the left sidebar content (e.g. SettingsPanel)
 *   leftTitle      — Title for the left sidebar header (default: "Settings")
 *   rightPanel     — React node for the right sidebar content (e.g. HistoryPanel)
 *   rightTitle     — Title for the right sidebar header (default: "History")
 *   headerTitle    — Title displayed in the center header
 *   headerMeta     — React node for meta info in the center header (badges, counts)
 *   headerControls — React node for extra controls in the center header (theme toggle, etc.)
 *   children       — Main content area (chat, viewer, etc.)
 */
export default function ThreePanelLayout({
    leftPanel,
    leftTitle = "Settings",
    rightPanel,
    rightTitle = "History",
    headerTitle = "",
    headerMeta = null,
    headerControls = null,
    children,
}) {
    const [showLeft, setShowLeft] = useState(() => {
        if (typeof window === "undefined") return true;
        const stored = localStorage.getItem("panel_left");
        return stored !== null ? stored === "true" : window.innerWidth >= 768;
    });
    const [showRight, setShowRight] = useState(() => {
        if (typeof window === "undefined") return true;
        const stored = localStorage.getItem("panel_right");
        return stored !== null ? stored === "true" : window.innerWidth >= 768;
    });

    const toggleLeft = () => {
        const next = !showLeft;
        setShowLeft(next);
        localStorage.setItem("panel_left", String(next));
        if (next && window.innerWidth < 768) {
            setShowRight(false);
            localStorage.setItem("panel_right", "false");
        }
    };

    const toggleRight = () => {
        const next = !showRight;
        setShowRight(next);
        localStorage.setItem("panel_right", String(next));
        if (next && window.innerWidth < 768) {
            setShowLeft(false);
            localStorage.setItem("panel_left", "false");
        }
    };

    return (
        <div className={styles.container}>
            {/* Left Sidebar */}
            <aside
                className={`${styles.leftSidebar} ${!showLeft ? styles.sidebarHidden : ""}`}
            >
                <div className={styles.sidebarHeader}>{leftTitle}</div>
                {leftPanel}
            </aside>

            {/* Main Center */}
            <section className={styles.main}>
                <div className={styles.glassHeader}>
                    <button
                        className={styles.headerToggle}
                        onClick={toggleLeft}
                        title={showLeft ? `Hide ${leftTitle.toLowerCase()}` : `Show ${leftTitle.toLowerCase()}`}
                    >
                        <Settings size={16} />
                    </button>
                    <span className={styles.headerTitle}>{headerTitle}</span>
                    {headerMeta}
                    {headerControls}
                    <button
                        className={styles.headerToggle}
                        onClick={toggleRight}
                        title={showRight ? `Hide ${rightTitle.toLowerCase()}` : `Show ${rightTitle.toLowerCase()}`}
                    >
                        <History size={16} />
                    </button>
                </div>
                {children}
            </section>

            {/* Right Sidebar */}
            <aside
                className={`${styles.rightSidebar} ${!showRight ? styles.sidebarHidden : ""}`}
            >
                <div className={styles.sidebarHeader}>{rightTitle}</div>
                {rightPanel}
            </aside>
        </div>
    );
}
