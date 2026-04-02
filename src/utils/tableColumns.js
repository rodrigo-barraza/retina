/**
 * tableColumns.js — Shared column factory functions for all *TableComponent
 * wrappers. Each factory returns one or more column definition objects
 * compatible with SortableTableComponent's `columns` prop.
 *
 * Usage:
 *   import { tokenColumns, costColumns, ... } from "../utils/tableColumns";
 *   const columns = [identityCol, ...tokenColumns(), ...costColumns(total)];
 */

import {
  FolderOpen,
  MessageSquare,
  Workflow,
  Zap,
  Clock,
} from "lucide-react";
import ModelBadgeComponent from "../components/ModelBadgeComponent";
import ProvidersBadgeComponent from "../components/ProvidersBadgeComponent";
import ProjectBadgeComponent from "../components/ProjectBadgeComponent";
import UserBadgeComponent from "../components/UserBadgeComponent";
import CountLinkComponent from "../components/CountLinkComponent";
import CostBadgeComponent from "../components/CostBadgeComponent";
import ProportionBarComponent from "../components/ProportionBarComponent";
import ModalityIconComponent from "../components/ModalityIconComponent";
import ToolIconComponent from "../components/ToolIconComponent";
import BadgeComponent from "../components/BadgeComponent";
import {
  formatTokenCount,
  formatLatency,
  formatTokensPerSec,
  formatDateTime,
} from "./utilities";
import styles from "../components/TableComponents.module.css";

/* ── Helpers ────────────────────────────────────────────── */

/** Renders a muted "—" dash — replaces all inline style={{ color: "var(--text-muted)" }} */
export const emptyDash = () => <span className={styles.emptyDash}>—</span>;

/** Render a value or a muted dash if falsy/zero */
export const valueOrDash = (val, render) =>
  val ? render(val) : emptyDash();

/** Merge modalities from an array of conversations into a single object */
export function mergeModalities(conversations) {
  const merged = {};
  for (const c of conversations) {
    if (!c.modalities) continue;
    for (const [key, val] of Object.entries(c.modalities)) {
      if (val) merged[key] = true;
    }
  }
  return Object.keys(merged).length > 0 ? merged : null;
}

/** Get duration in ms from createdAt/updatedAt or startedAt/finishedAt */
export function getDurationMs(row) {
  const start = row.startedAt || row.createdAt;
  const end = row.finishedAt || row.updatedAt;
  if (!start || !end) return 0;
  return Math.max(0, new Date(end) - new Date(start));
}

/** Format ms duration into human-readable string */
export function formatDuration(ms) {
  if (!ms || ms <= 0) return null;
  if (ms < 1000) return "<1s";
  const secs = Math.round(ms / 1000);
  if (secs < 60) return `${secs}s`;
  const mins = Math.floor(secs / 60);
  const rem = secs % 60;
  if (mins < 60) return rem > 0 ? `${mins}m ${rem}s` : `${mins}m`;
  const hrs = Math.floor(mins / 60);
  const remMins = mins % 60;
  return remMins > 0 ? `${hrs}h ${remMins}m` : `${hrs}h`;
}

/** Provider usage bar colors — cycled by row index */
export const PROVIDER_COLORS = [
  "#6366f1", "#a855f7", "#ec4899", "#f59e0b",
  "#10b981", "#3b82f6", "#ef4444", "#06b6d4",
];

/* ── Column Factories ───────────────────────────────────── */

/* ·· Identity / name columns ·· */

export const modelColumn = () => ({
  key: "model",
  label: "Model",
  render: (row) => <ModelBadgeComponent models={row.model ? [row.model] : []} />,
});

export const providerColumn = () => ({
  key: "provider",
  label: "Provider",
  render: (row) => (
    <ProvidersBadgeComponent providers={row.provider ? [row.provider] : []} />
  ),
});

export const projectColumn = () => ({
  key: "project",
  label: "Project",
  render: (row) => <ProjectBadgeComponent project={row.project} />,
});

export const userColumn = () => ({
  key: "username",
  label: "User",
  sortable: false,
  render: (row) => <UserBadgeComponent username={row.username} />,
});

/* ·· Models / Providers (as badge lists) ·· */

export const modelsListColumn = ({ mini = false } = {}) => ({
  key: "models",
  label: "Models",
  sortable: false,
  render: (row) => <ModelBadgeComponent models={row.models} mini={mini} />,
});

export const modelCountColumn = () => ({
  key: "modelCount",
  label: "Models",
  sortValue: (row) => (row.models?.length || row.modelCount || 0),
  render: (row) => <ModelBadgeComponent models={row.models || []} />,
});

export const providersListColumn = ({ mini = false } = {}) => ({
  key: "providers",
  label: "Providers",
  sortable: false,
  render: (row) => <ProvidersBadgeComponent providers={row.providers} mini={mini} />,
});

export const providerCountColumn = () => ({
  key: "providerCount",
  label: "Providers",
  sortValue: (row) => (row.providers || []).length,
  render: (row) => <ProvidersBadgeComponent providers={row.providers || []} />,
});

/* ·· Request / usage columns ·· */

export const requestsColumn = () => ({
  key: "totalRequests",
  label: "Requests",
  align: "right",
  render: (row) => row.totalRequests?.toLocaleString() || "0",
});

export const requestCountColumn = () => ({
  key: "requestCount",
  label: "Requests",
  sortable: true,
  align: "right",
  render: (row) =>
    (row.requestCount || 0) > 0 ? (
      <span className={styles.countCell}>
        <Zap size={10} />
        {row.requestCount}
      </span>
    ) : (
      emptyDash()
    ),
});

export const usageColumn = (totalRequests, color) => ({
  key: "usage",
  label: "Usage",
  sortValue: (row) => row.totalRequests,
  render: (row, i) => (
    <ProportionBarComponent
      value={row.totalRequests}
      total={totalRequests}
      color={color}
    />
  ),
});

/* ·· Modalities ·· */

export const modalitiesColumn = ({ mini = false, fromConversations = false } = {}) => ({
  key: "modalities",
  label: "Modalities",
  sortable: false,
  render: (row) => {
    const mods = fromConversations
      ? mergeModalities(row.conversations || [])
      : row.modalities;
    if (!mods) return emptyDash();
    return <ModalityIconComponent modalities={mods} size={mini ? 9 : 12} />;
  },
});

/* ·· Tools ·· */

export const toolsColumn = ({ mini = false, configModels } = {}) => ({
  key: "toolNames",
  label: "Tools",
  sortable: false,
  align: "left",
  render: (row) => {
    // Support either direct toolNames array or config-based lookup
    if (configModels) {
      const tools = configModels[`${row.provider}:${row.model}`];
      if (!tools?.length) return emptyDash();
      return <ToolIconComponent toolNames={tools} size={mini ? 10 : undefined} />;
    }
    return <ToolIconComponent toolNames={row.toolNames} size={mini ? 10 : undefined} />;
  },
});

/* ·· Token columns ·· */

/** Returns 4 columns: Tokens In, Tokens Out, Tokens (total), Tok/s */
export const tokenColumns = ({
  inputKey = "totalInputTokens",
  outputKey = "totalOutputTokens",
  tpsKey = "avgTokensPerSec",
  showDash = false,
} = {}) => [
  {
    key: inputKey,
    label: "Tokens In",
    align: "right",
    render: (row) => {
      const v = row[inputKey];
      if (showDash && !(v > 0)) return emptyDash();
      return formatTokenCount(v);
    },
  },
  {
    key: outputKey,
    label: "Tokens Out",
    align: "right",
    render: (row) => {
      const v = row[outputKey];
      if (showDash && !(v > 0)) return emptyDash();
      return formatTokenCount(v);
    },
  },
  {
    key: "totalTokens",
    label: "Tokens",
    align: "right",
    sortValue: (row) => (row[inputKey] || 0) + (row[outputKey] || 0),
    render: (row) => {
      const total = (row[inputKey] || 0) + (row[outputKey] || 0);
      if (showDash && total <= 0) return emptyDash();
      return total > 0 ? formatTokenCount(total) : "0";
    },
  },
  {
    key: tpsKey,
    label: "Tok/s",
    align: "right",
    render: (row) => formatTokensPerSec(row[tpsKey]),
  },
];

/* ·· Cost columns ·· */

/** Returns 2 columns: Cost, Cost % */
export const costColumns = (totalCost, { costKey = "totalCost", mini = false } = {}) => [
  {
    key: costKey,
    label: "Cost",
    sortable: true,
    align: "right",
    render: (row) => <CostBadgeComponent cost={row[costKey]} mini={mini} />,
  },
  {
    key: "costShare",
    label: "Cost %",
    sortable: true,
    sortValue: (row) => row[costKey],
    render: (row) => (
      <ProportionBarComponent
        value={row[costKey]}
        total={totalCost}
        color="var(--warning)"
        mini={mini}
      />
    ),
  },
];

/* ·· Latency ·· */

export const latencyColumn = (key = "avgLatency", label = "Avg Latency") => ({
  key,
  label,
  sortable: true,
  align: "right",
  render: (row) => {
    const v = row[key];
    if (!v || v <= 0) return emptyDash();
    return formatLatency(v);
  },
});

/* ·· Count link columns (Sessions / Conversations / Workflows) ·· */

/**
 * Returns 3 columns with CountLinkComponent: Sessions, Conversations, Workflows.
 * @param {string} entityKey — query-param key (e.g. "model", "provider", "project")
 * @param {Function} entityValue — (row) => value for the query param
 */
export const countLinkColumns = (entityKey, entityValue) => [
  {
    key: "sessionCount",
    label: "Sessions",
    align: "right",
    render: (row) => (
      <CountLinkComponent
        count={row.sessionCount}
        href={`/admin/sessions?${entityKey}=${encodeURIComponent(entityValue(row))}`}
        icon={FolderOpen}
      />
    ),
  },
  {
    key: "conversationCount",
    label: "Conversations",
    align: "right",
    render: (row) => (
      <CountLinkComponent
        count={row.conversationCount}
        href={`/admin/conversations?${entityKey}=${encodeURIComponent(entityValue(row))}`}
        icon={MessageSquare}
      />
    ),
  },
  {
    key: "workflowCount",
    label: "Workflows",
    align: "right",
    render: (row) => (
      <CountLinkComponent
        count={row.workflowCount}
        href={`/admin/workflows?${entityKey}=${encodeURIComponent(entityValue(row))}`}
        icon={Workflow}
      />
    ),
  },
];

/* ·· Conversation count (inline icon) ·· */

export const conversationCountColumn = () => ({
  key: "conversationCount",
  label: "Convos",
  sortable: true,
  align: "right",
  render: (row) => {
    const count = row.conversationCount || (row.conversations || []).length || 0;
    return (
      <span className={styles.countCell}>
        <MessageSquare size={10} />
        {count}
      </span>
    );
  },
});

/* ·· Duration columns ·· */

export const durationColumn = ({ useDurationMs = false } = {}) => ({
  key: "duration",
  label: "Duration",
  sortable: false,
  align: "right",
  sortValue: (row) => useDurationMs ? getDurationMs(row) : 0,
  render: (row) => {
    const ms = useDurationMs ? getDurationMs(row) : (() => {
      // Session-style: startedAt / finishedAt
      if (!row.startedAt || !row.finishedAt) return 0;
      return new Date(row.finishedAt) - new Date(row.startedAt);
    })();
    const dur = formatDuration(ms);
    if (!dur) return emptyDash();
    return (
      <span className={styles.durationCell}>
        <Clock size={10} />
        {dur}
      </span>
    );
  },
});

export const durationShareColumn = (totalDuration, { mini = false } = {}) => ({
  key: "durationShare",
  label: "Duration %",
  sortable: true,
  sortValue: (row) => getDurationMs(row),
  render: (row) => (
    <ProportionBarComponent
      value={getDurationMs(row)}
      total={totalDuration}
      color="var(--accent-color)"
      mini={mini}
    />
  ),
});

/* ·· Timestamps ·· */

export const createdAtColumn = (key = "createdAt") => ({
  key,
  label: "Created",
  sortable: true,
  align: "right",
  render: (row) => formatDateTime(row[key]),
});

/* ·· Session ID ·· */

export const sessionIdColumn = () => ({
  key: "id",
  label: "Session",
  sortable: false,
  render: (s) => (
    <a
      href={`/admin/conversations?session=${s.id}`}
      className={styles.sessionIdCell}
      title={`View conversations for session ${s.id}`}
      onClick={(e) => e.stopPropagation()}
    >
      <FolderOpen size={12} className={styles.sessionIcon} />
      <span className={styles.sessionIdText}>{s.id.slice(0, 8)}</span>
    </a>
  ),
});

/* ·· Conversation title ·· */

export const conversationTitleColumn = ({ mini = false } = {}) => ({
  key: "title",
  label: "Conversation",
  sortable: false,
  render: (c) => (
    <span className={`${styles.conversationTitle} ${mini ? styles.conversationTitleMini : ""}`}>
      <MessageSquare size={mini ? 9 : 12} />
      {c.title || "Untitled"}
    </span>
  ),
});

/* ·· Project / User as inline badges (for Conversations) ·· */

export const projectBadgeColumn = ({ mini = false } = {}) => ({
  key: "project",
  label: "Project",
  sortable: false,
  render: (c) =>
    c.project ? (
      <BadgeComponent variant="info" mini={mini}>{c.project}</BadgeComponent>
    ) : (
      emptyDash()
    ),
});

export const userBadgeColumn = ({ mini = false } = {}) => ({
  key: "username",
  label: "User",
  sortable: false,
  render: (c) =>
    c.username && c.username !== "unknown" ? (
      <BadgeComponent variant="provider" mini={mini}>{c.username}</BadgeComponent>
    ) : (
      emptyDash()
    ),
});

/* ·· Endpoint ·· */

export const endpointColumn = () => ({
  key: "endpoint",
  label: "Endpoint",
  render: (r) => (
    <BadgeComponent variant="endpoint">{r.endpoint || "-"}</BadgeComponent>
  ),
});

/* ·· Status ·· */

export const statusColumn = () => ({
  key: "success",
  label: "Status",
  render: (r) => (
    <BadgeComponent variant={r.success ? "success" : "error"}>
      {r.success ? "OK" : "ERR"}
    </BadgeComponent>
  ),
});
