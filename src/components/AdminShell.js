"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { usePathname, useRouter } from "next/navigation";
import { X } from "lucide-react";
import IrisService from "../services/IrisService";

import NavigationSidebarComponent from "./NavigationSidebarComponent";
import DatePickerComponent from "./DatePickerComponent";
import { AdminHeaderProvider, useAdminHeader } from "./AdminHeaderContext";
import styles from "./AdminShell.module.css";

function AdminShellInner({ children }) {
  const [newCount, setNewCount] = useState(0);
  const [generatingCount, setGeneratingCount] = useState(0);
  const [systemStatus, setSystemStatus] = useState("connected");
  const pathname = usePathname();
  const router = useRouter();

  // Track conversations by ID → messageCount to detect both new convos and updates
  const knownConvsRef = useRef(null); // null = not initialized
  const isOnConversationsRef = useRef(
    pathname.startsWith("/admin/conversations"),
  );

  // Keep ref in sync with pathname
  useEffect(() => {
    const onConvs = pathname.startsWith("/admin/conversations");
    isOnConversationsRef.current = onConvs;
    if (onConvs) {
      // Clear badge when navigating to conversations (any sub-route)
      setNewCount(0);
    }
  }, [pathname]);

  // SSE subscription for real-time generatingCount across all projects
  useEffect(() => {
    const es = IrisService.subscribeConversationStats((data) => {
      setGeneratingCount(data.generatingCount || 0);
    });
    return () => es.close();
  }, []);

  // ── Change Stream SSE: detect new conversations in real time ────
  // Falls back to polling if Change Streams aren't available.
  useEffect(() => {
    async function fetchConversations() {
      try {
        const data = await IrisService.getConversations({
          page: 1,
          limit: 50,
          sort: "updatedAt",
          order: "desc",
        });
        const list = data.data || [];
        const currentMap = new Map();
        for (const c of list) {
          currentMap.set(c.id, c.messages?.length || c.messageCount || 0);
        }

        if (knownConvsRef.current === null) {
          knownConvsRef.current = currentMap;
        } else if (!isOnConversationsRef.current) {
          let changes = 0;
          for (const [id, msgCount] of currentMap) {
            const known = knownConvsRef.current.get(id);
            if (known === undefined) {
              changes++;
            } else if (msgCount > known) {
              changes++;
            }
          }
          if (changes > 0) {
            setNewCount((prev) => prev + changes);
          }
          knownConvsRef.current = currentMap;
        } else {
          knownConvsRef.current = currentMap;
        }
      } catch {
        // ignore
      }
    }

    async function fetchHealth() {
      try {
        const health = await IrisService.getHealth();
        setSystemStatus(health.mongo || "connected");
      } catch {
        setSystemStatus("disconnected");
      }
    }

    // Initial loads
    fetchConversations();
    fetchHealth();

    // Health check on a long interval (doesn't need real-time)
    const healthInterval = setInterval(fetchHealth, 30000);

    // Subscribe to change stream SSE
    let pollInterval = null;
    const es = IrisService.subscribeCollectionChanges({
      onStatus: (data) => {
        if (!data.changeStreams) {
          // No Change Streams — fall back to polling
          if (!pollInterval) {
            pollInterval = setInterval(fetchConversations, 5000);
          }
        }
      },
      onChange: (event) => {
        if (event.collection === "conversations") {
          fetchConversations();
        }
      },
    });

    return () => {
      es.close();
      clearInterval(healthInterval);
      if (pollInterval) clearInterval(pollInterval);
    };
  }, []);

  const handleNavClick = useCallback((href) => {
    if (href.startsWith("/admin/conversations")) {
      setNewCount(0);
    }
  }, []);

  const { controls, titleBadge, dateRange, setDateRange, sessionFilter, setSessionFilter } = useAdminHeader();

  const hasSessionFilter = !!sessionFilter;

  const handleClearSession = useCallback(() => {
    setSessionFilter(null);
    router.push("/admin/conversations");
  }, [setSessionFilter, router]);

  // Derive page title from pathname (first segment only)
  const pageTitle = (() => {
    const segment = pathname.replace("/admin", "").replace(/^\//, "");
    if (!segment) return "Dashboard";
    const first = segment.split("/")[0];
    return first.charAt(0).toUpperCase() + first.slice(1);
  })();

  return (
    <div className={styles.shell}>
      <NavigationSidebarComponent
        mode="admin"
        liveCount={newCount}
        systemStatus={systemStatus}
        isGenerating={generatingCount > 0}
        onNavClick={handleNavClick}
      />
      <div className={styles.mainArea}>
        <header className={styles.header}>
          <h1 className={styles.headerTitle}>
            {pageTitle}
            {titleBadge != null && (
              <span className={styles.titleCount}>: {titleBadge}</span>
            )}
          </h1>
          {hasSessionFilter && (
            <button
              type="button"
              className={styles.sessionBadge}
              onClick={handleClearSession}
              title="Clear session filter and show all conversations"
            >
              <span className={styles.sessionBadgeLabel}>Session</span>
              <span className={styles.sessionBadgeId}>
                {sessionFilter.slice(0, 8)}
              </span>
              <X size={12} className={styles.sessionBadgeX} />
            </button>
          )}
          <div className={styles.headerDatePicker}>
            <DatePickerComponent
              from={dateRange.from}
              to={dateRange.to}
              onChange={setDateRange}
              disabled={hasSessionFilter}
            />
          </div>
          {controls && <div className={styles.headerControls}>{controls}</div>}
        </header>
        <div className={styles.main}>{children}</div>
      </div>
    </div>
  );
}

export default function AdminShell({ children }) {
  return (
    <AdminHeaderProvider>
      <AdminShellInner>{children}</AdminShellInner>
    </AdminHeaderProvider>
  );
}
