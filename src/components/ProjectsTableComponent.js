import {
  FolderOpen,
  MessageSquare,
  Workflow,
} from "lucide-react";
import SortableTableComponent from "./SortableTableComponent";
import ProjectBadgeComponent from "./ProjectBadgeComponent";
import CountLinkComponent from "./CountLinkComponent";
import CostBadgeComponent from "./CostBadgeComponent";
import ProportionBarComponent from "./ProportionBarComponent";
import {
  formatNumber,
  formatLatency,
  formatTokensPerSec,
} from "../utils/utilities";

/**
 * ProjectsTableComponent — reusable admin table for displaying project-level
 * aggregated stats (requests, tokens, cost, latency, etc.).
 *
 * @param {Object}  props
 * @param {Array}   props.projects          - Array of project stat objects
 * @param {number}  [props.totalRequests]   - Sum of all project requests (for proportion bars)
 * @param {number}  [props.totalCost]       - Sum of all project costs (for proportion bars)
 * @param {string}  [props.emptyText]       - Text shown when no data
 * @param {boolean} [props.compact]         - Reduced column set
 * @param {string}  [props.title]           - Optional table title
 * @param {number}  [props.maxHeight]       - Optional max height for scrollable body
 */
export default function ProjectsTableComponent({
  projects = [],
  totalRequests: totalRequestsProp,
  totalCost: totalCostProp,
  emptyText = "No projects yet",
  compact = false,
  title = "Projects",
  maxHeight = 420,
}) {
  const totalRequests =
    (totalRequestsProp ?? projects.reduce((s, x) => s + x.totalRequests, 0)) || 1;
  const totalCost =
    (totalCostProp ?? projects.reduce((s, x) => s + (x.totalCost || 0), 0)) || 1;

  const allColumns = [
    {
      key: "project",
      label: "Project",
      render: (p) => <ProjectBadgeComponent project={p.project} />,
    },
    {
      key: "totalRequests",
      label: "Requests",
      align: "right",
      render: (p) => formatNumber(p.totalRequests),
    },
    {
      key: "usage",
      label: "Usage",
      sortValue: (p) => p.totalRequests,
      render: (p) => (
        <ProportionBarComponent
          value={p.totalRequests}
          total={totalRequests}
        />
      ),
    },
    { key: "providerCount", label: "Providers", align: "right" },
    { key: "modelCount", label: "Models", align: "right" },
    {
      key: "totalInputTokens",
      label: "Tokens In",
      align: "right",
      render: (p) => formatNumber(p.totalInputTokens),
    },
    {
      key: "totalOutputTokens",
      label: "Tokens Out",
      align: "right",
      render: (p) => formatNumber(p.totalOutputTokens),
    },
    {
      key: "avgTokensPerSec",
      label: "Tok/s",
      align: "right",
      render: (p) => formatTokensPerSec(p.avgTokensPerSec),
    },
    {
      key: "totalCost",
      label: "Cost",
      align: "right",
      render: (p) => <CostBadgeComponent cost={p.totalCost} />,
    },
    {
      key: "costShare",
      label: "Cost %",
      sortValue: (p) => p.totalCost,
      render: (p) => (
        <ProportionBarComponent
          value={p.totalCost}
          total={totalCost}
          color="var(--warning)"
        />
      ),
    },
    {
      key: "avgLatency",
      label: "Avg Latency",
      align: "right",
      render: (p) => formatLatency(p.avgLatency),
    },
    {
      key: "sessionCount",
      label: "Sessions",
      align: "right",
      render: (p) => (
        <CountLinkComponent
          count={p.sessionCount}
          href={`/admin/sessions?project=${encodeURIComponent(p.project)}`}
          icon={FolderOpen}
        />
      ),
    },
    {
      key: "conversationCount",
      label: "Conversations",
      align: "right",
      render: (p) => (
        <CountLinkComponent
          count={p.conversationCount}
          href={`/admin/conversations?project=${encodeURIComponent(p.project)}`}
          icon={MessageSquare}
        />
      ),
    },
    {
      key: "workflowCount",
      label: "Workflows",
      align: "right",
      render: (p) => (
        <CountLinkComponent
          count={p.workflowCount}
          href={`/admin/workflows?project=${encodeURIComponent(p.project)}`}
          icon={Workflow}
        />
      ),
    },
  ];

  const COMPACT_KEYS = [
    "project",
    "totalRequests",
    "totalCost",
    "avgLatency",
    "sessionCount",
    "conversationCount",
  ];
  const columns = compact
    ? allColumns.filter((c) => COMPACT_KEYS.includes(c.key))
    : allColumns;

  return (
    <SortableTableComponent
      title={title}
      maxHeight={maxHeight}
      columns={columns}
      data={projects}
      getRowKey={(p, i) => p.project || i}
      emptyText={emptyText}
    />
  );
}
