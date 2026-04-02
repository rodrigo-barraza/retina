"use client";

import { useState, useMemo, useRef, useEffect } from "react";
import {
  ChevronDown,
  ChevronRight,
  Loader2,
  CheckCircle2,
  AlertCircle,
  Zap,
  Database,
  HardDrive,
  Cpu,
  Terminal,
} from "lucide-react";
import { renderToolName } from "../utils/utilities";
import styles from "./ToolActivityPanelComponent.module.css";

const DATA_SOURCE_LABELS = {
  cached: "Cached",
  onDemand: "Live",
  static: "Static",
  compute: "Compute",
};

const DATA_SOURCE_ICONS = {
  cached: Database,
  onDemand: Zap,
  static: HardDrive,
  compute: Cpu,
};

// Tools that support real-time output streaming
const STREAMABLE_TOOL_NAMES = new Set([
  "execute_shell",
  "execute_python",
  "execute_javascript",
]);

const TOOL_LANGUAGE = {
  execute_shell: "bash",
  execute_python: "python",
  execute_javascript: "javascript",
};

// ── Terminal Output Sub-Component ────────────────────────────────────

const PROMPT_PREFIXES = {
  bash: "$ ",
  python: ">>> ",
  javascript: "> ",
};

const CONTINUATION_PREFIXES = {
  python: "... ",
  javascript: ".. ",
};

const DEFAULT_CWD = {
  bash: "/tmp",
  python: "python3",
  javascript: "node",
};

function formatInputPrompt(input, language, cwd) {
  if (!input) return "";
  const prompt = PROMPT_PREFIXES[language] || "$ ";
  const contPrompt = CONTINUATION_PREFIXES[language] || "  ";
  const lines = input.split("\n");
  const resolvedCwd = cwd || DEFAULT_CWD[language] || "";
  const pathPrefix = resolvedCwd ? `${resolvedCwd} ` : "";
  return lines
    .map((line, i) => `${i === 0 ? pathPrefix + prompt : contPrompt}${line}`)
    .join("\n");
}

function TerminalOutput({ output, language, isStreaming, input, cwd }) {
  const preRef = useRef(null);

  useEffect(() => {
    if (preRef.current) {
      preRef.current.scrollTop = preRef.current.scrollHeight;
    }
  }, [output]);

  if (!output && !input) return null;

  const formattedInput = formatInputPrompt(input, language, cwd);

  return (
    <div className={styles.terminalContainer}>
      <div className={styles.terminalHeader}>
        <Terminal size={10} />
        <span>{language || "output"}</span>
        {isStreaming && <span className={styles.terminalLive}>● live</span>}
      </div>
      <pre ref={preRef} className={styles.terminalBody}>
        {formattedInput && (
          <span className={styles.terminalInput}>{formattedInput}{"\n"}</span>
        )}
        {output}
        {isStreaming && <span className={styles.terminalCursor}>▊</span>}
      </pre>
    </div>
  );
}

/**
 * ToolActivityPanelComponent
 *
 * A collapsible panel showing real-time tool/function call activity
 * during AI generation. Renders a list of tool invocations with their
 * status (calling → done/error), name, data source type, and arguments.
 * For compute tools (shell, python, js), shows live terminal output.
 *
 * @param {object} props
 * @param {Array}  props.activities         — Array of { id, name, args, status, dataSource? }
 * @param {boolean} [props.defaultExpanded] — initial collapse state
 * @param {Map}    [props.toolSchemaMap]    — name → schema lookup for dataSource
 * @param {Map}    [props.streamingOutputs] — toolCallId → accumulated output string
 */
export default function ToolActivityPanelComponent({
  activities = [],
  defaultExpanded = true,
  toolSchemaMap,
  streamingOutputs,
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
            const isStreamable = STREAMABLE_TOOL_NAMES.has(activity.name);
            const output = streamingOutputs?.get(activity.id);
            const isStreaming = isStreamable && activity.status === "calling";

            return (
              <div key={activity.id} className={styles.toolActivityGroup}>
                <div className={styles.toolActivityItem}>
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
                        .map(([k, v]) => {
                          const str = typeof v === "string" ? v : JSON.stringify(v);
                          return `${k}: ${str.length > 60 ? str.slice(0, 57) + "…" : str}`;
                        })
                        .join(", ")}
                      )
                    </span>
                  )}
                </div>
                {/* Terminal output for streamable compute tools */}
                {isStreamable && (output || activity.args?.command || activity.args?.code) && (
                  <TerminalOutput
                    output={output || ""}
                    language={TOOL_LANGUAGE[activity.name]}
                    isStreaming={isStreaming}
                    input={activity.args?.command || activity.args?.code || null}
                    cwd={activity.args?.cwd || null}
                  />
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
