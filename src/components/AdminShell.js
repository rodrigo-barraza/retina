"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { usePathname } from "next/navigation";
import Link from "next/link";
import {
  LayoutDashboard,
  ScrollText,
  MessageSquare,
  Eye,
  ArrowLeft,
  Server,
  DollarSign,
  GitBranch,
  Sun,
  Moon,
  Image as ImageIcon,
  Layers,
} from "lucide-react";
import { IrisService } from "../services/IrisService";
import { useTheme } from "./ThemeProvider";
import ThreePanelLayout from "./ThreePanelLayout";
import styles from "./AdminShell.module.css";

const NAV_ITEMS = [
  { href: "/admin", label: "Dashboard", icon: LayoutDashboard },
  { href: "/admin/requests", label: "Requests", icon: ScrollText },
  { href: "/admin/conversations", label: "Conversations", icon: MessageSquare, showBadge: true },
  { href: "/admin/workflows", label: "Workflows", icon: GitBranch },
  { href: "/admin/providers", label: "Providers", icon: Layers },
  { href: "/admin/media", label: "Media", icon: ImageIcon },
  { href: "/admin/pricing", label: "Usage", icon: DollarSign },
  { href: "/admin/models", label: "Models", icon: Server },
];

function AdminNavContent({ liveCount, systemStatus, onNavClick }) {
  const pathname = usePathname();

  return (
    <div className={styles.navContent}>
      <nav className={styles.nav}>
        {NAV_ITEMS.map((item) => {
          const Icon = item.icon;
          const isActive =
            item.href === "/admin"
              ? pathname === "/admin"
              : pathname.startsWith(item.href);

          return (
            <Link
              key={item.href}
              href={item.href}
              className={`${styles.navLink} ${isActive ? styles.active : ""}`}
              onClick={() => onNavClick?.(item.href)}
              data-panel-close
            >
              <Icon className={styles.navIcon} />
              <span>{item.label}</span>
              {item.showBadge && liveCount > 0 && (
                <span className={`${styles.badge} ${styles.live}`}>
                  {liveCount}
                </span>
              )}
            </Link>
          );
        })}
      </nav>
      <div className={styles.footer}>
        <Link href="/" className={styles.navLink} data-panel-close>
          <ArrowLeft className={styles.navIcon} />
          <span>Back to Retina</span>
        </Link>
        <div className={styles.statusRow}>
          <span
            className={`${styles.statusDot} ${systemStatus !== "connected" ? styles.offline : ""}`}
          />
          <span>
            Prism {systemStatus === "connected" ? "Connected" : "Offline"}
          </span>
        </div>
      </div>
    </div>
  );
}

export default function AdminShell({ children }) {
  const [newCount, setNewCount] = useState(0);
  const [systemStatus, setSystemStatus] = useState("connected");
  const pathname = usePathname();
  const { theme, toggleTheme } = useTheme();

  // Track conversations by ID → messageCount to detect both new convos and updates
  const knownConvsRef = useRef(null); // null = not initialized
  const isOnConversationsRef = useRef(pathname === "/admin/conversations");

  // Keep ref in sync with pathname
  useEffect(() => {
    isOnConversationsRef.current = pathname === "/admin/conversations";
    if (pathname === "/admin/conversations") {
      // Clear badge when navigating to conversations
      setNewCount(0);
    }
  }, [pathname]);

  useEffect(() => {
    async function poll() {
      try {
        const health = await IrisService.getHealth();
        setSystemStatus(health.mongo || "connected");

        // Fetch recent conversations to detect new ones and updates
        const data = await IrisService.getConversations({
          page: 1,
          limit: 50,
          sort: "updatedAt",
          order: "desc",
        });
        const list = data.data || [];

        // Build a map of id → messageCount
        const currentMap = new Map();
        for (const c of list) {
          currentMap.set(c.id, c.messages?.length || c.messageCount || 0);
        }

        if (knownConvsRef.current === null) {
          // First load — snapshot current state
          knownConvsRef.current = currentMap;
        } else if (!isOnConversationsRef.current) {
          // Only count changes when NOT on the conversations page
          let changes = 0;
          for (const [id, msgCount] of currentMap) {
            const known = knownConvsRef.current.get(id);
            if (known === undefined) {
              // Brand new conversation
              changes++;
            } else if (msgCount > known) {
              // Existing conversation got new messages
              changes++;
            }
          }
          if (changes > 0) {
            setNewCount((prev) => prev + changes);
          }
          // Update known state
          knownConvsRef.current = currentMap;
        } else {
          // On conversations page — keep known in sync but don't count
          knownConvsRef.current = currentMap;
        }
      } catch {
        setSystemStatus("disconnected");
      }
    }

    poll();
    const interval = setInterval(poll, 3000); // 3s
    return () => clearInterval(interval);
  }, []);

  const handleNavClick = useCallback((href) => {
    if (href === "/admin/conversations") {
      setNewCount(0);
    }
  }, []);

  // Derive page title from pathname
  const pageTitle = (() => {
    const segment = pathname.replace("/admin", "").replace(/^\//, "");
    if (!segment) return "Dashboard";
    return segment.charAt(0).toUpperCase() + segment.slice(1);
  })();

  const headerControls = (
    <button className={styles.themeToggle} onClick={toggleTheme}>
      {theme === "dark" ? <Sun size={16} /> : <Moon size={16} />}
    </button>
  );

  const headerMeta = (
    <div className={styles.headerMeta}>
      <Eye size={12} />
      <span>Iris · Prism Admin</span>
    </div>
  );

  return (
    <ThreePanelLayout
      leftPanel={
        <AdminNavContent
          liveCount={newCount}
          systemStatus={systemStatus}
          onNavClick={handleNavClick}
        />
      }
      leftTitle="Admin"
      rightPanel={null}
      headerTitle={pageTitle}
      headerMeta={headerMeta}
      headerControls={headerControls}
    >
      <div className={styles.main}>{children}</div>
    </ThreePanelLayout>
  );
}
