import ToolIconComponent from "../../components/ToolIconComponent";
import {
  modelColumn,
  providerColumn,
  projectColumn,
  modalitiesColumn,
  endpointColumn,
  tokenColumns,
  costColumns,
  statusColumn,
  createdAtColumn,
  latencyColumn,
  emptyDash,
} from "../../utils/tableColumns";

/**
 * getRequestsColumns — shared column definitions for the requests table.
 *
 * @param {Object} [opts]
 * @param {number} [opts.totalCost=1] — Total cost across all visible requests
 *                                       (used for the Cost % proportion bar)
 * @param {boolean} [opts.mini=false] — Mini density mode
 */
export const getRequestsColumns = ({ totalCost = 1, mini = false } = {}) => [
  createdAtColumn("timestamp"),
  projectColumn(),
  modalitiesColumn({ mini }),
  endpointColumn(),
  providerColumn(),
  modelColumn(),
  {
    key: "toolsUsed",
    label: "Tools",
    sortable: true,
    align: "left",
    render: (r) => {
      if (!r.toolsUsed || !r.toolNames?.length) return emptyDash();
      return <ToolIconComponent toolNames={r.toolNames} size={mini ? 10 : undefined} />;
    },
  },
  ...tokenColumns({ inputKey: "inputTokens", outputKey: "outputTokens", tpsKey: "tokensPerSec" }),
  ...costColumns(totalCost, { costKey: "estimatedCost", mini }),
  latencyColumn("totalTime", "Latency"),
  statusColumn(),
];
