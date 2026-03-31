import {
  FolderOpen,
  MessageSquare,
  Workflow,
} from "lucide-react";
import SortableTableComponent from "./SortableTableComponent";
import ModelBadgeComponent from "./ModelBadgeComponent";
import ProvidersBadgeComponent from "./ProvidersBadgeComponent";
import CountLinkComponent from "./CountLinkComponent";
import CostBadgeComponent from "./CostBadgeComponent";
import ProportionBarComponent from "./ProportionBarComponent";
import ToolIconComponent from "./ToolIconComponent";
import {
  formatNumber,
  formatLatency,
  formatTokensPerSec,
} from "../utils/utilities";

/**
 * ModelsTableComponent — reusable admin table for displaying model-level
 * aggregated stats (requests, tokens, cost, latency, tools, etc.).
 *
 * @param {Object}  props
 * @param {Array}   props.models            - Array of model stat objects
 * @param {Object}  [props.configModels]    - Map of "provider:model" → tool names array (from Prism config)
 * @param {number}  [props.totalRequests]   - Sum of all model requests (for proportion bars)
 * @param {number}  [props.totalCost]       - Sum of all model costs (for proportion bars)
 * @param {string}  [props.emptyText]       - Text shown when no data
 * @param {boolean} [props.compact]         - Reduced column set
 * @param {string}  [props.title]           - Optional table title
 * @param {number}  [props.maxHeight]       - Optional max height for scrollable body
 */
export default function ModelsTableComponent({
  models = [],
  configModels = {},
  totalRequests: totalRequestsProp,
  totalCost: totalCostProp,
  emptyText = "No data yet",
  compact = false,
  title = "Models",
  maxHeight = 420,
}) {
  const totalRequests =
    (totalRequestsProp ??
    models.reduce((s, m) => s + m.totalRequests, 0)) || 1;
  const totalCost =
    (totalCostProp ??
    models.reduce((s, m) => s + (m.totalCost || 0), 0)) || 1;

  const allColumns = [
    {
      key: "model",
      label: "Model",
      render: (m) => <ModelBadgeComponent models={m.model ? [m.model] : []} />,
    },
    {
      key: "totalRequests",
      label: "Requests",
      align: "right",
      render: (m) => formatNumber(m.totalRequests),
    },
    {
      key: "usage",
      label: "Usage",
      sortValue: (m) => m.totalRequests,
      render: (m) => (
        <ProportionBarComponent
          value={m.totalRequests}
          total={totalRequests}
        />
      ),
    },
    {
      key: "provider",
      label: "Provider",
      render: (m) => (
        <ProvidersBadgeComponent
          providers={m.provider ? [m.provider] : []}
        />
      ),
    },
    {
      key: "toolsUsed",
      label: "Tools",
      align: "left",
      sortable: false,
      render: (m) => {
        const tools = configModels[`${m.provider}:${m.model}`];
        if (!tools?.length) {
          return <span style={{ color: "var(--text-muted)" }}>—</span>;
        }
        return <ToolIconComponent toolNames={tools} />;
      },
    },
    {
      key: "totalInputTokens",
      label: "Tokens In",
      align: "right",
      render: (m) => formatNumber(m.totalInputTokens),
    },
    {
      key: "totalOutputTokens",
      label: "Tokens Out",
      align: "right",
      render: (m) => formatNumber(m.totalOutputTokens),
    },
    {
      key: "avgTokensPerSec",
      label: "Tok/s",
      align: "right",
      render: (m) => formatTokensPerSec(m.avgTokensPerSec),
    },
    {
      key: "totalCost",
      label: "Cost",
      align: "right",
      render: (m) => <CostBadgeComponent cost={m.totalCost} />,
    },
    {
      key: "costShare",
      label: "Cost %",
      sortValue: (m) => m.totalCost,
      render: (m) => (
        <ProportionBarComponent
          value={m.totalCost}
          total={totalCost}
          color="var(--warning)"
        />
      ),
    },
    {
      key: "avgLatency",
      label: "Avg Latency",
      align: "right",
      render: (m) => formatLatency(m.avgLatency),
    },
    {
      key: "sessionCount",
      label: "Sessions",
      align: "right",
      render: (m) => (
        <CountLinkComponent
          count={m.sessionCount}
          href={`/admin/sessions?model=${encodeURIComponent(m.model)}`}
          icon={FolderOpen}
        />
      ),
    },
    {
      key: "conversationCount",
      label: "Conversations",
      align: "right",
      render: (m) => (
        <CountLinkComponent
          count={m.conversationCount}
          href={`/admin/conversations?model=${encodeURIComponent(m.model)}`}
          icon={MessageSquare}
        />
      ),
    },
    {
      key: "workflowCount",
      label: "Workflows",
      align: "right",
      render: (m) => (
        <CountLinkComponent
          count={m.workflowCount}
          href={`/admin/workflows?model=${encodeURIComponent(m.model)}`}
          icon={Workflow}
        />
      ),
    },
  ];

  const COMPACT_KEYS = [
    "model",
    "totalRequests",
    "provider",
    "totalCost",
    "avgLatency",
  ];
  const columns = compact
    ? allColumns.filter((c) => COMPACT_KEYS.includes(c.key))
    : allColumns;

  return (
    <SortableTableComponent
      title={title}
      maxHeight={maxHeight}
      columns={columns}
      data={models}
      getRowKey={(m, i) => `${m.provider}-${m.model}-${i}`}
      emptyText={emptyText}
    />
  );
}
