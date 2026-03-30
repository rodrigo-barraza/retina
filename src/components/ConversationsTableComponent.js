"use client";

import { useRouter } from "next/navigation";
import { MessageSquare } from "lucide-react";
import SortableTableComponent from "./SortableTableComponent";
import ModalityIconComponent from "./ModalityIconComponent";
import ToolIconComponent from "./ToolIconComponent";
import ModelBadgeComponent from "./ModelBadgeComponent";
import BadgeComponent from "./BadgeComponent";
import {
  formatNumber,
  formatCost,
  formatLatency,
  formatTokensPerSec,
  formatDateTime,
} from "../utils/utilities";

/**
 * ConversationsTableComponent — reusable admin table for displaying
 * conversation lists (used in sessions, request associations, etc.).
 *
 * @param {Object} props
 * @param {Array} props.conversations — Array of conversation objects
 * @param {string} [props.emptyText] — Text when empty
 * @param {string} [props.sortKey] — Current sort key
 * @param {string} [props.sortDir] — Current sort direction
 * @param {Function} [props.onSort] — (key, dir) => void (server-side sort)
 * @param {boolean} [props.compact] — Slightly reduced padding
 * @param {string} [props.maxHeight] — CSS max-height for scrollable tables
 */

const COLUMNS = [
  {
    key: "title",
    label: "Conversation",
    sortable: false,
    render: (c) => (
      <span style={{ display: "inline-flex", alignItems: "center", gap: 6 }}>
        <MessageSquare size={12} style={{ opacity: 0.5, flexShrink: 0 }} />
        {c.title || "Untitled"}
      </span>
    ),
  },
  {
    key: "project",
    label: "Project",
    sortable: false,
    render: (c) =>
      c.project ? (
        <BadgeComponent variant="info">{c.project}</BadgeComponent>
      ) : (
        <span style={{ color: "var(--text-muted)" }}>—</span>
      ),
  },
  {
    key: "username",
    label: "User",
    sortable: false,
    render: (c) =>
      c.username && c.username !== "unknown" ? (
        <BadgeComponent variant="provider">{c.username}</BadgeComponent>
      ) : (
        <span style={{ color: "var(--text-muted)" }}>—</span>
      ),
  },
  {
    key: "modalities",
    label: "Modalities",
    sortable: false,
    render: (c) => {
      if (!c.modalities)
        return <span style={{ color: "var(--text-muted)" }}>—</span>;
      return <ModalityIconComponent modalities={c.modalities} size={13} />;
    },
  },
  {
    key: "models",
    label: "Model(s)",
    sortable: false,
    render: (c) => <ModelBadgeComponent models={c.models} />,
  },
  {
    key: "providers",
    label: "Providers",
    sortable: false,
    render: (c) => {
      if (
        !c.providers ||
        (Array.isArray(c.providers) && c.providers.length === 0)
      ) {
        return <span style={{ color: "var(--text-muted)" }}>—</span>;
      }
      const list = Array.isArray(c.providers) ? c.providers : [c.providers];
      return (
        <span style={{ display: "inline-flex", gap: 4 }}>
          {list.map((p) => (
            <BadgeComponent key={p} variant="endpoint">
              {p}
            </BadgeComponent>
          ))}
        </span>
      );
    },
  },
  {
    key: "toolNames",
    label: "Tools",
    sortable: false,
    align: "left",
    render: (c) => <ToolIconComponent toolNames={c.toolNames} />,
  },
  {
    key: "inputTokens",
    label: "In Tokens",
    sortable: true,
    align: "right",
    render: (c) =>
      c.inputTokens > 0 ? (
        formatNumber(c.inputTokens)
      ) : (
        <span style={{ color: "var(--text-muted)" }}>—</span>
      ),
  },
  {
    key: "outputTokens",
    label: "Out Tokens",
    sortable: true,
    align: "right",
    render: (c) =>
      c.outputTokens > 0 ? (
        formatNumber(c.outputTokens)
      ) : (
        <span style={{ color: "var(--text-muted)" }}>—</span>
      ),
  },
  {
    key: "totalTokens",
    label: "Tokens",
    sortable: false,
    align: "right",
    render: (c) => {
      const total = (c.inputTokens || 0) + (c.outputTokens || 0);
      return total > 0 ? (
        formatNumber(total)
      ) : (
        <span style={{ color: "var(--text-muted)" }}>—</span>
      );
    },
  },
  {
    key: "avgTokensPerSec",
    label: "Tok/s",
    sortable: true,
    align: "right",
    render: (c) => formatTokensPerSec(c.avgTokensPerSec),
  },
  {
    key: "totalLatency",
    label: "Latency",
    sortable: true,
    align: "right",
    render: (c) =>
      c.totalLatency > 0 ? (
        formatLatency(c.totalLatency)
      ) : (
        <span style={{ color: "var(--text-muted)" }}>—</span>
      ),
  },
  {
    key: "totalCost",
    label: "Cost",
    sortable: true,
    align: "right",
    render: (c) => formatCost(c.totalCost),
  },
  {
    key: "createdAt",
    label: "Created",
    sortable: true,
    align: "right",
    render: (c) => formatDateTime(c.createdAt),
  },
  {
    key: "duration",
    label: "Duration",
    sortable: false,
    align: "right",
    sortValue: (c) => {
      if (!c.createdAt || !c.updatedAt) return 0;
      return new Date(c.updatedAt) - new Date(c.createdAt);
    },
    render: (c) => {
      if (!c.createdAt || !c.updatedAt) {
        return <span style={{ color: "var(--text-muted)" }}>—</span>;
      }
      const ms = new Date(c.updatedAt) - new Date(c.createdAt);
      if (ms < 1000) return "<1s";
      const secs = Math.round(ms / 1000);
      if (secs < 60) return `${secs}s`;
      const mins = Math.floor(secs / 60);
      const rem = secs % 60;
      if (mins < 60) return rem > 0 ? `${mins}m ${rem}s` : `${mins}m`;
      const hrs = Math.floor(mins / 60);
      const remMins = mins % 60;
      return remMins > 0 ? `${hrs}h ${remMins}m` : `${hrs}h`;
    },
  },
];

export default function ConversationsTableComponent({
  conversations = [],
  emptyText = "No conversations",
  sortKey,
  sortDir,
  onSort,
  compact = false,
  maxHeight,
}) {
  const router = useRouter();

  return (
    <SortableTableComponent
      columns={COLUMNS}
      data={conversations}
      sortKey={sortKey}
      sortDir={sortDir}
      onSort={onSort}
      getRowKey={(c) => c.id || c._id}
      onRowClick={(c) => router.push(`/admin/conversations/${c.id}`)}
      emptyText={emptyText}
      maxHeight={maxHeight || (compact ? "300px" : undefined)}
    />
  );
}
