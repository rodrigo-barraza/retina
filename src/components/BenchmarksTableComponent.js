import { useMemo, useCallback } from "react";
import { TableComponent } from "@rodrigo-barraza/components";
import {
  benchmarkStatusColumn,
  benchmarkModelColumn,
  benchmarkToolsColumn,
  benchmarkThinkingColumn,
  benchmarkSizeColumn,
  benchmarkResponseColumn,
  benchmarkLatencyColumn,
  benchmarkDurationColumn,
  benchmarkTokensInColumn,
  benchmarkTokensOutColumn,
  benchmarkTokPerSecColumn,
  benchmarkCostColumn,
  benchmarkDateColumn,
  benchmarkMatchModeColumn,
} from "../utils/tableColumns";
import styles from "./BenchmarksTableComponent.module.css";

/**
 * BenchmarksTableComponent — reusable table for displaying benchmark run
 * results (per-model pass/fail, response, latency, throughput, cost).
 *
 * Eager row population: when `pendingTargets` is provided, all model
 * rows are shown immediately (as "Queued"). Completed results replace
 * their pending counterparts, concurrently-running models each show
 * their own progress bar, and remaining targets appear dimmed with a
 * queued indicator.
 *
 * Supports concurrent model execution: `activeModels` is a Map keyed
 * by "provider:model" → { model, progress, phase }. Multiple models
 * from different provider buckets can run simultaneously.
 *
 * @param {Object}   props
 * @param {Array}    props.results           - Array of per-model result objects from a benchmark run
 * @param {string}   [props.emptyText]       - Text shown when no results
 * @param {boolean}  [props.mini]            - Mini density mode
 * @param {string}   [props.title]           - Optional table title
 * @param {number}   [props.maxHeight]       - Optional max height for scrollable body
 * @param {string}   [props.sortKey]         - Current sort key
 * @param {string}   [props.sortDir]         - Current sort direction
 * @param {Function} [props.onSort]          - (key, dir) => void
 * @param {string}   [props.expectedValue]   - Expected value to highlight in responses
 * @param {Function} [props.onRowClick]      - (row) => void — called when a row is clicked
 * @param {string}   [props.activeRowKey]    - Key of the currently active/selected row
 * @param {Map}      [props.activeModels]    - Map<"provider:model", { model, progress, phase }> of all running models
 * @param {Array}    [props.pendingTargets]  - Full list of model targets for the current run
 */
export default function BenchmarksTableComponent({
  results = [],
  expectedValue,
  modelConfigMap = {},
  emptyText = "No results",
  mini = false,
  title,
  maxHeight,
  sortKey,
  sortDir,
  onSort,
  onRowClick,
  activeRowKey,
  activeModels = new Map(),
  pendingTargets = [],
}) {
  const columns = useMemo(
    () => [
      benchmarkStatusColumn(),
      benchmarkModelColumn(),
      benchmarkToolsColumn(),
      benchmarkThinkingColumn(),
      benchmarkSizeColumn({ modelConfigMap }),
      benchmarkMatchModeColumn(),
      benchmarkResponseColumn({ expectedValue }),
      benchmarkDurationColumn(),
      benchmarkLatencyColumn(),
      benchmarkTokensInColumn(),
      benchmarkTokensOutColumn(),
      benchmarkTokPerSecColumn(),
      benchmarkCostColumn(),
      benchmarkDateColumn(),
    ],
    [expectedValue, modelConfigMap],
  );

  // Build display data: completed results + active running rows + queued pending rows
  const displayData = useMemo(() => {
    // No pending targets — fall back to simple results-only mode
    if (!pendingTargets.length) {
      if (activeModels.size === 0) return results;
      // Append synthetic running rows for all active models
      const runningRows = [...activeModels.values()].map((entry) => ({
        _running: true,
        _progress: entry.progress,
        _phase: entry.phase,
        provider: entry.model.provider,
        model: entry.model.model,
        label: entry.model.label || entry.model.model,
      }));
      return [...results, ...runningRows];
    }

    // Eager population: build a row for every target
    // Track which targets have completed results by index (order-preserving)
    const rows = [];
    const completedByIndex = new Map();

    // Map completed results back to their target index by matching provider + model/display_name
    // Results arrive in order, so the i-th result of a given provider:model corresponds
    // to the i-th target with that same provider:model.
    const targetCounters = new Map(); // "provider:model" → indices among targets
    const resultCounters = new Map(); // "provider:model" → next result index

    // First pass: count how many times each target key appears
    for (let i = 0; i < pendingTargets.length; i++) {
      const t = pendingTargets[i];
      const tKey = `${t.provider}:${t.model}`;
      if (!targetCounters.has(tKey)) targetCounters.set(tKey, []);
      targetCounters.get(tKey).push(i);
    }

    // Map each result to its target index
    for (const r of results) {
      const rKey = `${r.provider}:${r.model}`;
      const count = resultCounters.get(rKey) || 0;
      const indices = targetCounters.get(rKey);
      if (indices && count < indices.length) {
        completedByIndex.set(indices[count], r);
      }
      resultCounters.set(rKey, count + 1);
    }

    for (let i = 0; i < pendingTargets.length; i++) {
      const target = pendingTargets[i];

      // Check if this target has a completed result
      if (completedByIndex.has(i)) {
        rows.push(completedByIndex.get(i));
        continue;
      }

      // Check if this target matches any concurrently-running model
      const modelKey = `${target.provider}:${target.model}`;
      const activeEntry = activeModels.get(modelKey);

      if (activeEntry) {
        // Verify it's the right instance (first unfinished one for this key)
        const rKey = modelKey;
        const completedCount = resultCounters.get(rKey) || 0;
        const indices = targetCounters.get(rKey);
        const isActiveInstance = indices && indices.indexOf(i) === completedCount;

        if (isActiveInstance) {
          rows.push({
            _running: true,
            _progress: activeEntry.progress,
            _phase: activeEntry.phase,
            provider: activeEntry.model.provider,
            model: activeEntry.model.model,
            label: activeEntry.model.label || activeEntry.model.model,
          });
          continue;
        }
      }

      // Pending/queued
      rows.push({
        _pending: true,
        provider: target.provider,
        model: target.model,
        label: target.display_name || target.model,
      });
    }

    return rows;
  }, [results, activeModels, pendingTargets]);

  // Assign a CSS class for running/pending rows
  const getRowClassName = useCallback((row) => {
    if (row._running) return styles.runningRow;
    if (row._pending) return styles.pendingRow;
    return "";
  }, []);

  // Build a custom style variable for progress width on running rows
  const getRowStyle = useCallback((row) => {
    if (!row._running) return undefined;
    return { "--progress": `${(row._progress || 0) * 100}%` };
  }, []);

  return (
    <TableComponent
      title={title}
      maxHeight={maxHeight}
      columns={columns}
      data={displayData}
      sortKey={sortKey}
      sortDir={sortDir}
      onSort={onSort}
      onRowClick={onRowClick}
      activeRowKey={activeRowKey}
      getRowKey={(r, i) => `${r.provider}:${r.label}:${i}`}
      getRowClassName={getRowClassName}
      getRowStyle={getRowStyle}
      emptyText={emptyText}
      mini={mini}
      storageKey="benchmarks"
    />
  );
}
