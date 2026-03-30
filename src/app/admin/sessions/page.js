"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import {
  FolderOpen,
  MessageSquare,
  ChevronDown,
  Loader,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import IrisService from "../../../services/IrisService";
import { useAdminHeader } from "../../../components/AdminHeaderContext";
import styles from "./page.module.css";

function formatCost(cost) {
  if (!cost || cost === 0) return "$0.00";
  if (cost < 0.01) return `$${cost.toFixed(4)}`;
  return `$${cost.toFixed(2)}`;
}

function formatTime(iso) {
  if (!iso) return "";
  const d = new Date(iso);
  const now = new Date();
  const diffMs = now - d;
  const diffMin = Math.floor(diffMs / 60000);
  if (diffMin < 1) return "just now";
  if (diffMin < 60) return `${diffMin}m ago`;
  const diffH = Math.floor(diffMin / 60);
  if (diffH < 24) return `${diffH}h ago`;
  const diffD = Math.floor(diffH / 24);
  if (diffD < 7) return `${diffD}d ago`;
  return d.toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

const PAGE_SIZE = 30;

export default function SessionsPage() {
  const [sessions, setSessions] = useState([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [expandedIds, setExpandedIds] = useState(new Set());

  const loadSessions = useCallback(async () => {
    try {
      const data = await IrisService.getSessions({
        page,
        limit: PAGE_SIZE,
        sort: "createdAt",
        order: "desc",
      });
      setSessions(data.data || []);
      setTotal(data.total || 0);
    } catch (err) {
      console.error("Failed to load sessions:", err);
    } finally {
      setLoading(false);
    }
  }, [page]);

  useEffect(() => {
    setLoading(true);
    loadSessions();
  }, [loadSessions]);

  const toggleExpand = (id) => {
    setExpandedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const totalPages = Math.ceil(total / PAGE_SIZE);

  const { setControls } = useAdminHeader();

  useEffect(() => {
    setControls(
      <span style={{ fontSize: 12, color: "var(--text-secondary)" }}>
        {total} sessions
      </span>,
    );
  }, [setControls, total]);

  useEffect(() => {
    return () => setControls(null);
  }, [setControls]);

  if (loading) {
    return (
      <div className={styles.page}>
        <div className={styles.loading}>
          <Loader size={16} className={styles.spinning} />
          Loading sessions…
        </div>
      </div>
    );
  }

  if (sessions.length === 0) {
    return (
      <div className={styles.page}>
        <div className={styles.empty}>
          <FolderOpen size={36} style={{ opacity: 0.3 }} />
          <div>No sessions yet</div>
          <div style={{ fontSize: 12 }}>
            Sessions are created when AI calls are grouped together
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={styles.page}>
      <div className={styles.sessionList}>
        {sessions.map((session) => {
          const isExpanded = expandedIds.has(session.id);
          const convos = session.conversations || [];

          return (
            <div key={session.id} className={styles.sessionCard}>
              {/* Clickable header */}
              <div
                className={styles.sessionHeader}
                onClick={() => toggleExpand(session.id)}
              >
                <div className={styles.sessionHeaderLeft}>
                  <FolderOpen size={16} className={styles.sessionIcon} />
                  <span className={styles.sessionId}>
                    {session.id.slice(0, 8)}
                  </span>
                  <span className={styles.sessionTimestamp}>
                    {formatTime(session.createdAt)}
                  </span>
                </div>
                <div className={styles.sessionHeaderRight}>
                  <span
                    className={`${styles.badge} ${styles.badgeConversations}`}
                  >
                    <MessageSquare size={10} />
                    {session.conversationCount || convos.length || 0}
                  </span>
                  {(session.totalCost || 0) > 0 && (
                    <span className={`${styles.badge} ${styles.badgeCost}`}>
                      {formatCost(session.totalCost)}
                    </span>
                  )}
                  <ChevronDown
                    size={14}
                    className={`${styles.chevron} ${isExpanded ? styles.chevronOpen : ""}`}
                  />
                </div>
              </div>

              {/* Expanded: show conversations */}
              {isExpanded && convos.length > 0 && (
                <div className={styles.conversationList}>
                  {convos.map((conv) => (
                    <Link
                      key={conv.id}
                      href={`/admin/conversations/${conv.id}`}
                      className={styles.conversationRow}
                    >
                      <MessageSquare
                        size={13}
                        className={styles.convIcon}
                      />
                      <span className={styles.convTitle}>
                        {conv.title || "Untitled"}
                      </span>
                      <div className={styles.convMeta}>
                        {conv.project && (
                          <span className={styles.convProject}>
                            {conv.project}
                          </span>
                        )}
                        {(conv.totalCost || 0) > 0 && (
                          <span className={styles.convCost}>
                            {formatCost(conv.totalCost)}
                          </span>
                        )}
                        <span className={styles.convTime}>
                          {formatTime(conv.updatedAt || conv.createdAt)}
                        </span>
                      </div>
                    </Link>
                  ))}
                </div>
              )}

              {isExpanded && convos.length === 0 && (
                <div className={styles.conversationList}>
                  <div
                    style={{
                      padding: "12px",
                      textAlign: "center",
                      color: "var(--text-muted)",
                      fontSize: 12,
                    }}
                  >
                    No conversations linked
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className={styles.pagination}>
          <button
            className={styles.paginationBtn}
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            disabled={page <= 1}
          >
            <ChevronLeft size={14} />
            Prev
          </button>
          <span>
            Page {page} of {totalPages}
          </span>
          <button
            className={styles.paginationBtn}
            onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
            disabled={page >= totalPages}
          >
            Next
            <ChevronRight size={14} />
          </button>
        </div>
      )}
    </div>
  );
}
