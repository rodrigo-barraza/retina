import SortableTableComponent from "./SortableTableComponent";
import {
  modelColumn,
  requestsColumn,
  usageColumn,
  providerColumn,
  toolsColumn,
  tokenColumns,
  costColumns,
  latencyColumn,
  countLinkColumns,
} from "../utils/tableColumns";

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
    modelColumn(),
    requestsColumn(),
    usageColumn(totalRequests),
    providerColumn(),
    toolsColumn({ configModels }),
    ...tokenColumns(),
    ...costColumns(totalCost),
    latencyColumn(),
    ...countLinkColumns("model", (row) => row.model),
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
