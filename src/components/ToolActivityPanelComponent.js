"use client";

import { useState } from "react";
import {
  ChevronDown,
  ChevronRight,
  Loader2,
  CheckCircle2,
  AlertCircle,
  Zap,
} from "lucide-react";
import { renderToolName } from "../utils/utilities";
import styles from "./ToolActivityPanelComponent.module.css";

/**
 * ToolActivityPanelComponent
 *
 * A collapsible panel showing real-time tool/function call activity
 * during AI generation. Renders a list of tool invocations with their
 * status (calling → done/error), name, and arguments.
 *
 * @param {object} props
 * @param {Array}  props.activities   — Array of { id, name, args, status }
 * @param {boolean} [props.defaultExpanded=true] — initial collapse state
 */
export default function ToolActivityPanelComponent({
  activities = [],
  defaultExpanded = true,
}) {
  const [expanded, setExpanded] = useState(defaultExpanded);

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
          {activities.map((activity) => (
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
          ))}
        </div>
      )}
    </div>
  );
}
