"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import {
  FolderOpen,
  MessageSquare,
  Loader,
  Zap,
  Clock,
} from "lucide-react";
import IrisService from "../../../services/IrisService";
import PaginationComponent from "../../../components/PaginationComponent";
import SortableTableComponent from "../../../components/SortableTableComponent";
import ConversationsTableComponent from "../../../components/ConversationsTableComponent";
import ProjectBadgeComponent from "../../../components/ProjectBadgeComponent";
import UserBadgeComponent from "../../../components/UserBadgeComponent";
import CostBadgeComponent from "../../../components/CostBadgeComponent";
import ModalityIconComponent from "../../../components/ModalityIconComponent";
import ModelBadgeComponent from "../../../components/ModelBadgeComponent";
import ProvidersBadgeComponent from "../../../components/ProvidersBadgeComponent";
import ToolIconComponent from "../../../components/ToolIconComponent";
import { useAdminHeader } from "../../../components/AdminHeaderContext";
import { formatNumber, formatDateTime, formatLatency, formatTokensPerSec } from "../../../utils/utilities";

import styles from "./page.module.css";

const PAGE_SIZE = 30;
const POLL_INTERVAL = 1000; // 1s

/** Merge modalities from all conversations into a single object */
function mergeModalities(conversations) {
  const merged = {};
  for (const c of conversations) {
    if (!c.modalities) continue;
    for (const [key, val] of Object.entries(c.modalities)) {
      if (val) merged[key] = true;
    }
  }
  return Object.keys(merged).length > 0 ? merged : null;
}

/** Format session duration from startedAt/finishedAt */
function formatDuration(session) {
  if (!session.startedAt || !session.finishedAt) return null;
  const ms = new Date(session.finishedAt) - new Date(session.startedAt);
  if (ms < 1000) return "<1s";
  const secs = Math.round(ms / 1000);
  if (secs < 60) return `${secs}s`;
  const mins = Math.floor(secs / 60);
  const rem = secs % 60;
  return rem > 0 ? `${mins}m ${rem}s` : `${mins}m`;
}

const SESSION_COLUMNS = [
  {
    key: "id",
    label: "Session",
    sortable: false,
    render: (s) => (
      <span className={styles.sessionIdCell}>
        <FolderOpen size={12} className={styles.sessionIcon} />
        <span className={styles.sessionIdText}>{s.id.slice(0, 8)}</span>
      </span>
    ),
  },
  {
    key: "project",
    label: "Project",
    sortable: false,
    render: (s) => <ProjectBadgeComponent project={s.project} />,
  },
  {
    key: "username",
    label: "User",
    sortable: false,
    render: (s) => <UserBadgeComponent username={s.username} />,
  },
  {
    key: "modalities",
    label: "Modalities",
    sortable: false,
    render: (s) => {
      const merged = mergeModalities(s.conversations || []);
      if (!merged) return <span style={{ color: "var(--text-muted)" }}>—</span>;
      return <ModalityIconComponent modalities={merged} size={12} />;
    },
  },
  {
    key: "models",
    label: "Models",
    sortable: false,
    render: (s) => <ModelBadgeComponent models={s.models} />,
  },
  {
    key: "providers",
    label: "Providers",
    sortable: false,
    render: (s) => <ProvidersBadgeComponent providers={s.providers} />,
  },
  {
    key: "toolNames",
    label: "Tools",
    sortable: false,
    align: "left",
    render: (s) => <ToolIconComponent toolNames={s.toolNames} />,
  },
  {
    key: "conversationCount",
    label: "Convos",
    sortable: true,
    align: "right",
    render: (s) => {
      const count = s.conversationCount || (s.conversations || []).length || 0;
      return (
        <span className={styles.countCell}>
          <MessageSquare size={10} />
          {count}
        </span>
      );
    },
  },
  {
    key: "requestCount",
    label: "Requests",
    sortable: true,
    align: "right",
    render: (s) =>
      (s.requestCount || 0) > 0 ? (
        <span className={styles.countCell}>
          <Zap size={10} />
          {s.requestCount}
        </span>
      ) : (
        <span style={{ color: "var(--text-muted)" }}>—</span>
      ),
  },
  {
    key: "totalInputTokens",
    label: "In Tokens",
    sortable: true,
    align: "right",
    render: (s) =>
      (s.totalInputTokens || 0) > 0 ? (
        formatNumber(s.totalInputTokens)
      ) : (
        <span style={{ color: "var(--text-muted)" }}>—</span>
      ),
  },
  {
    key: "totalOutputTokens",
    label: "Out Tokens",
    sortable: true,
    align: "right",
    render: (s) =>
      (s.totalOutputTokens || 0) > 0 ? (
        formatNumber(s.totalOutputTokens)
      ) : (
        <span style={{ color: "var(--text-muted)" }}>—</span>
      ),
  },
  {
    key: "avgTokensPerSec",
    label: "Tok/s",
    sortable: true,
    align: "right",
    render: (s) => formatTokensPerSec(s.avgTokensPerSec),
  },
  {
    key: "totalLatency",
    label: "Latency",
    sortable: true,
    align: "right",
    render: (s) =>
      s.totalLatency > 0 ? (
        formatLatency(s.totalLatency)
      ) : (
        <span style={{ color: "var(--text-muted)" }}>—</span>
      ),
  },
  {
    key: "totalCost",
    label: "Cost",
    sortable: true,
    align: "right",
    render: (s) => <CostBadgeComponent cost={s.totalCost} />,
  },
  {
    key: "duration",
    label: "Duration",
    sortable: false,
    align: "right",
    render: (s) => {
      const dur = formatDuration(s);
      if (!dur) return <span style={{ color: "var(--text-muted)" }}>—</span>;
      return (
        <span className={styles.durationCell}>
          <Clock size={10} />
          {dur}
        </span>
      );
    },
  },
  {
    key: "createdAt",
    label: "Created",
    sortable: true,
    align: "right",
    render: (s) => {
      return formatDateTime(s.createdAt);
    },
  },
];

export default function SessionsPage() {
  const [sessions, setSessions] = useState([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const intervalRef = useRef(null);
  const initialLoadDone = useRef(false);

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
      if (!initialLoadDone.current) {
        initialLoadDone.current = true;
        setLoading(false);
      }
    }
  }, [page]);

  useEffect(() => {
    initialLoadDone.current = false;
    setLoading(true);
    loadSessions();
    intervalRef.current = setInterval(loadSessions, POLL_INTERVAL);
    return () => clearInterval(intervalRef.current);
  }, [loadSessions]);

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
      <SortableTableComponent
        columns={SESSION_COLUMNS}
        data={sessions}
        getRowKey={(s) => s.id}
        renderExpandedContent={(session) => (
          <ConversationsTableComponent
            conversations={session.conversations || []}
            emptyText="No conversations linked"
            compact
            mini
          />
        )}
        emptyText="No sessions"
      />

      {/* Pagination */}
      <PaginationComponent
        page={page}
        totalPages={totalPages}
        totalItems={total}
        onPageChange={setPage}
        limit={PAGE_SIZE}
      />
    </div>
  );
}
