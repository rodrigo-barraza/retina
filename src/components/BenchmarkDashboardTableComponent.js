import { useMemo } from "react";
import { CheckCircle2, XCircle } from "lucide-react";
import TableComponent from "./TableComponent";
import {
  dashboardModelColumn,
  dashboardProviderColumn,
  dashboardTestsColumn,
  dashboardPassedColumn,
  dashboardFailedColumn,
  dashboardPassRateColumn,
  dashboardAvgLatencyColumn,
  dashboardCostColumn,
} from "../utils/tableColumns";
import styles from "./BenchmarkDashboardComponent.module.css";

/**
 * BenchmarkDashboardTableComponent — reusable table for the /benchmarks
 * dashboard, displaying aggregated per-model performance stats.
 * Uses the shared TableComponent base with column definitions from
 * tableColumns.js, following the same pattern as BenchmarksTableComponent,
 * ConversationsTableComponent, etc.
 *
 * @param {Object}   props
 * @param {Array}    props.models           - Array of aggregated model stats
 * @param {string}   [props.emptyText]      - Text shown when no data
 * @param {string}   [props.title]          - Optional table title
 * @param {number}   [props.maxHeight]      - Optional max height for scrollable body
 */
export default function BenchmarkDashboardTableComponent({
  models = [],
  emptyText = "No benchmark data",
  title,
  maxHeight,
}) {
  const columns = useMemo(
    () => [
      dashboardModelColumn(),
      dashboardProviderColumn(),
      dashboardTestsColumn(),
      dashboardPassedColumn(),
      dashboardFailedColumn(),
      dashboardPassRateColumn(),
      dashboardAvgLatencyColumn(),
      dashboardCostColumn(),
    ],
    [],
  );

  const renderExpandedContent = useMemo(
    () => (row) => {
      if (!row.benchmarks?.length) return null;
      return (
        <div className={styles.detailGrid}>
          {row.benchmarks.map((b, i) => {
            const bRate =
              b.total > 0 ? Math.round((b.passed / b.total) * 100) : 0;
            return (
              <div
                key={i}
                className={`${styles.detailCard} ${
                  b.latestPassed
                    ? styles.detailCardPassed
                    : b.latestErrored
                      ? styles.detailCardErrored
                      : styles.detailCardFailed
                }`}
              >
                <div className={styles.detailHeader}>
                  <div className={styles.detailName}>{b.name}</div>
                  <span
                    className={`${styles.detailStatus} ${
                      b.latestPassed
                        ? styles.detailStatusPassed
                        : styles.detailStatusFailed
                    }`}
                  >
                    {b.latestPassed
                      ? "✓ Latest"
                      : b.latestErrored
                        ? "⚠ Error"
                        : "✗ Latest"}
                  </span>
                </div>
                <div className={styles.detailStats}>
                  <span className={styles.detailRuns}>
                    {b.total} run{b.total !== 1 ? "s" : ""}
                  </span>
                  <span className={styles.detailPassed}>
                    <CheckCircle2 size={10} /> {b.passed}
                  </span>
                  <span className={styles.detailFailed}>
                    <XCircle size={10} /> {b.failed + b.errored}
                  </span>
                  <span
                    className={styles.detailRate}
                    style={{
                      color:
                        bRate >= 80
                          ? "var(--success)"
                          : bRate >= 50
                            ? "var(--warning)"
                            : "var(--danger)",
                    }}
                  >
                    {bRate}%
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      );
    },
    [],
  );

  return (
    <TableComponent
      title={title}
      maxHeight={maxHeight}
      columns={columns}
      data={models}
      getRowKey={(m) => `${m.provider}:${m.model}`}
      renderExpandedContent={renderExpandedContent}
      emptyText={emptyText}
      storageKey="benchmark-dashboard"
    />
  );
}
