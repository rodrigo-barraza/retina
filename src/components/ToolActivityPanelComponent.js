"use client";

import { useState, useMemo } from "react";
import {
  ChevronDown,
  ChevronRight,
  Loader2,
  CheckCircle2,
  AlertCircle,
  Zap,
  Database,
  HardDrive,
} from "lucide-react";
import { renderToolName } from "../utils/utilities";
import styles from "./ToolActivityPanelComponent.module.css";

const DATA_SOURCE_LABELS = {
  cached: "Cached",
  onDemand: "Live",
  static: "Static",
};

const DATA_SOURCE_ICONS = {
  cached: Database,
  onDemand: Zap,
  static: HardDrive,
};

/**
 * ToolActivityPanelComponent
 *
 * A collapsible panel showing real-time tool/function call activity
 * during AI generation. Renders a list of tool invocations with their
 * status (calling → done/error), name, data source type, and arguments.
 *
 * @param {object} props
 * @param {Array}  props.activities   — Array of { id, name, args, status, dataSource? }
 * @param {boolean} [props.defaultExpanded=true] — initial collapse state
 * @param {Map}    [props.toolSchemaMap] — name → schema lookup for dataSource
 */
export default function ToolActivityPanelComponent({
  activities = [],
  defaultExpanded = true,
  toolSchemaMap,
}) {
  const [expanded, setExpanded] = useState(defaultExpanded);

  // Build a schema lookup if provided
  const schemaLookup = useMemo(() => {
    if (toolSchemaMap instanceof Map) return toolSchemaMap;
    return new Map();
  }, [toolSchemaMap]);

  if (activities.length === 0) return null;

  const doneCount = activities.filter((t) => t.status === "done").length;

  return (
    <div className={styles.toolPanel}>
      <button
        className={styles.toolPanelHeader}
        onClick={() => setExpanded((v) => !v)}
      >
        <Zap size={14} className={styles.toolPanelIcon} />
        <span>
          Tool Activity ({doneCount}/{activities.length})
        </span>
        {expanded ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
      </button>
      {expanded && (
        <div className={styles.toolPanelBody}>
          {activities.map((activity) => {
            const schema = schemaLookup.get(activity.name);
            const ds = schema?.dataSource;
            const dsType = ds?.type;

            return (
              <div key={activity.id} className={styles.toolActivityItem}>
                <span className={styles.toolStatusIcon}>
                  {activity.status === "calling" && (
                    <Loader2 size={12} className={styles.spinner} />
                  )}
                  {activity.status === "done" && (
                    <CheckCircle2 size={12} className={styles.toolSuccess} />
                  )}
                  {activity.status === "error" && (
                    <AlertCircle size={12} className={styles.toolError} />
                  )}
                </span>
                <span className={styles.toolName}>
                  {renderToolName(activity.name)}
                </span>
                {dsType && (
                  <span className={styles.toolTypeBadge} data-type={dsType}>
                    {(() => {
                      const Icon = DATA_SOURCE_ICONS[dsType];
                      return Icon ? <Icon size={8} /> : null;
                    })()}
                    {DATA_SOURCE_LABELS[dsType] || dsType}
                  </span>
                )}
                {Object.keys(activity.args || {}).length > 0 && (
                  <span className={styles.toolArgs}>
                    (
                    {Object.entries(activity.args)
                      .map(([k, v]) => `${k}: ${v}`)
                      .join(", ")}
                    )
                  </span>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
