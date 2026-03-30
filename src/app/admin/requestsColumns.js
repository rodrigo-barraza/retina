import { Wrench } from "lucide-react";
import { TOOL_ICON_MAP, TOOL_COLORS } from "../../components/WorkflowNodeConstants";
import ModalityIconsComponent from "../../components/ModalityIconsComponent";
import TooltipComponent from "../../components/TooltipComponent";
import BadgeComponent from "../../components/BadgeComponent";
import {
  formatNumber,
  formatCost,
  formatLatency,
  formatTokensPerSec,
} from "../../utils/utilities";
import styles from "./page.module.css";

export const getRequestsColumns = () => [
  {
    key: "timestamp",
    label: "Time",
    render: (r) => (r.timestamp ? new Date(r.timestamp).toLocaleString() : "-"),
  },
  { key: "project", label: "Project" },
  {
    key: "modality",
    label: "Modality",
    sortable: false,
    render: (r) => {
      if (!r.modalities) return <span style={{ color: "var(--text-muted)" }}>—</span>;
      return (
        <ModalityIconsComponent
          modalities={r.modalities}
          size={13}
        />
      );
    },
  },
  {
    key: "endpoint",
    label: "Endpoint",
    render: (r) => (
      <BadgeComponent variant="endpoint">{r.endpoint || "-"}</BadgeComponent>
    ),
  },
  {
    key: "provider",
    label: "Provider",
    render: (r) => (
      <BadgeComponent variant="provider">{r.provider || "-"}</BadgeComponent>
    ),
  },
  { key: "model", label: "Model" },
  {
    key: "toolsUsed",
    label: "Tools",
    sortable: true,
    align: "left",
    render: (r) => {
      const names = r.toolNames;
      if (!r.toolsUsed || !names?.length) {
        return <span style={{ color: "var(--text-muted)" }}>—</span>;
      }

      const resolved = new Map();
      for (const raw of names) {
        if (TOOL_ICON_MAP[raw]) {
          // Direct match — canonical tool name (e.g. "Web Search")
          if (!resolved.has(raw)) resolved.set(raw, TOOL_ICON_MAP[raw]);
        } else {
          // Custom function call — group under "Function Calling"
          const fallbackIcon = TOOL_ICON_MAP["Function Calling"] || Wrench;
          if (!resolved.has("Function Calling")) {
            resolved.set("Function Calling", fallbackIcon);
          }
        }
      }
      return (
        <span className={styles.toolPills}>
          {[...resolved.entries()].map(([label, Icon]) => (
            <TooltipComponent key={label} label={label} position="top">
              <span className={styles.toolPill}>
                <Icon size={12} style={{ color: TOOL_COLORS[label] || "#f97316" }} />
              </span>
            </TooltipComponent>
          ))}
        </span>
      );
    },
  },
  {
    key: "inputTokens",
    label: "In Tokens",
    render: (r) => formatNumber(r.inputTokens),
    align: "right",
  },
  {
    key: "outputTokens",
    label: "Out Tokens",
    render: (r) => formatNumber(r.outputTokens),
    align: "right",
  },
  {
    key: "totalTokens",
    label: "Tokens",
    sortable: false,
    render: (r) => formatNumber((r.inputTokens || 0) + (r.outputTokens || 0)),
    align: "right",
  },
  {
    key: "estimatedCost",
    label: "Cost",
    render: (r) => formatCost(r.estimatedCost),
    align: "right",
  },
  {
    key: "tokensPerSec",
    label: "Tok/s",
    render: (r) => formatTokensPerSec(r.tokensPerSec),
    align: "right",
  },
  {
    key: "totalTime",
    label: "Latency",
    render: (r) => formatLatency(r.totalTime),
    align: "right",
  },
  {
    key: "success",
    label: "Status",
    render: (r) => (
      <BadgeComponent variant={r.success ? "success" : "error"}>
        {r.success ? "OK" : "ERR"}
      </BadgeComponent>
    ),
  },
];
