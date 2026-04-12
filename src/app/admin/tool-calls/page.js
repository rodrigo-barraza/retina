"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import {
  BarChart3,
  Zap,
  CheckCircle,
  AlertTriangle,
  Clock,
  Activity,
} from "lucide-react";
import ToolsApiService from "../../../services/ToolsApiService";
import TableComponent from "../../../components/TableComponent";
import BadgeComponent from "../../../components/BadgeComponent";
import { ErrorMessage } from "../../../components/StateMessageComponent";
import { useAdminHeader } from "../../../components/AdminHeaderContext";
import {
  formatNumber,
  formatLatency,
  formatDateTime,
  buildDateRangeParams,
} from "../../../utils/utilities";
import styles from "./page.module.css";

// ── Column definitions for per-tool stats table ──────────────
function getToolColumns() {
  return [
    {
      key: "toolName",
      label: "Tool",
      description: "Registered tool function name",
      sortable: true,
      render: (r) => (
        <BadgeComponent variant="provider">{r.toolName}</BadgeComponent>
      ),
    },
    {
      key: "count",
      label: "Calls",
      description: "Total number of invocations",
      sortable: true,
      align: "right",
      render: (r) => formatNumber(r.count),
    },
    {
      key: "avgMs",
      label: "Avg Latency",
      description: "Mean execution time across all calls",
      sortable: true,
      align: "right",
      render: (r) => formatLatency(r.avgMs / 1000),
    },
    {
      key: "minMs",
      label: "Min",
      description: "Fastest execution time recorded",
      sortable: true,
      align: "right",
      render: (r) => formatLatency(r.minMs / 1000),
    },
    {
      key: "maxMs",
      label: "Max",
      description: "Slowest execution time recorded",
      sortable: true,
      align: "right",
      render: (r) => formatLatency(r.maxMs / 1000),
    },
    {
      key: "errors",
      label: "Errors",
      description: "Total failed invocations",
      sortable: true,
      align: "right",
      render: (r) =>
        r.errors > 0 ? (
          <span className={styles.errorCount}>{r.errors}</span>
        ) : (
          <span className={styles.zeroErrors}>0</span>
        ),
    },
    {
      key: "errorRate",
      label: "Error %",
      description: "Percentage of calls that failed",
      sortable: true,
      align: "right",
      render: (r) => {
        if (r.errorRate === 0) return <span className={styles.zeroErrors}>0%</span>;
        return (
          <span className={r.errorRate > 5 ? styles.highErrorRate : styles.errorCount}>
            {r.errorRate}%
          </span>
        );
      },
    },
    {
      key: "totalTransferBytes",
      label: "Transfer",
      description: "Total bytes transferred (in + out)",
      sortable: true,
      align: "right",
      render: (r) => {
        if (!r.totalTransferBytes || r.totalTransferBytes <= 0) return "—";
        if (r.totalTransferBytes > 1_048_576) {
          return `${(r.totalTransferBytes / 1_048_576).toFixed(1)} MB`;
        }
        return `${(r.totalTransferBytes / 1024).toFixed(1)} KB`;
      },
    },
  ];
}

// ── Domain breakdown columns ─────────────────────────────────
function getDomainColumns() {
  return [
    {
      key: "domain",
      label: "Domain",
      sortable: true,
      render: (r) => (
        <BadgeComponent variant="info">{r.domain || "—"}</BadgeComponent>
      ),
    },
    {
      key: "count",
      label: "Calls",
      sortable: true,
      align: "right",
      render: (r) => formatNumber(r.count),
    },
    {
      key: "avgMs",
      label: "Avg Latency",
      sortable: true,
      align: "right",
      render: (r) => formatLatency(r.avgMs / 1000),
    },
    {
      key: "errors",
      label: "Errors",
      sortable: true,
      align: "right",
      render: (r) =>
        r.errors > 0 ? (
          <span className={styles.errorCount}>{r.errors}</span>
        ) : (
          <span className={styles.zeroErrors}>0</span>
        ),
    },
  ];
}

// ── Slowest calls columns ────────────────────────────────────
function getSlowestColumns() {
  return [
    {
      key: "toolName",
      label: "Tool",
      sortable: false,
      render: (r) => (
        <BadgeComponent variant="provider">{r.toolName}</BadgeComponent>
      ),
    },
    {
      key: "domain",
      label: "Domain",
      sortable: false,
      render: (r) => (
        <BadgeComponent variant="info">{r.domain || "—"}</BadgeComponent>
      ),
    },
    {
      key: "elapsedMs",
      label: "Latency",
      sortable: false,
      align: "right",
      render: (r) => formatLatency(r.elapsedMs / 1000),
    },
    {
      key: "success",
      label: "Status",
      sortable: false,
      render: (r) =>
        r.success ? (
          <BadgeComponent variant="success">OK</BadgeComponent>
        ) : (
          <BadgeComponent variant="error">Error</BadgeComponent>
        ),
    },
    {
      key: "callerAgent",
      label: "Agent",
      sortable: false,
      render: (r) =>
        r.callerAgent ? (
          <BadgeComponent variant="accent">{r.callerAgent}</BadgeComponent>
        ) : (
          "—"
        ),
    },
    {
      key: "timestamp",
      label: "When",
      sortable: false,
      render: (r) => (r.timestamp ? formatDateTime(r.timestamp) : "—"),
    },
  ];
}

export default function ToolCallsPage() {
  const { setControls, setTitleBadge, dateRange } = useAdminHeader();
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Sort state for tools table
  const [toolSort, setToolSort] = useState("count");
  const [toolOrder, setToolOrder] = useState("desc");

  // Sort state for domain table
  const [domainSort, setDomainSort] = useState("count");
  const [domainOrder, setDomainOrder] = useState("desc");

  const loadStats = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const params = {};
      const dateParams = buildDateRangeParams(dateRange);
      if (dateParams.since) params.since = dateParams.since;
      const data = await ToolsApiService.getToolCallStats(params);
      setStats(data);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [dateRange]);

  useEffect(() => {
    loadStats();
  }, [loadStats]);

  // ── Header controls ────────────────────────────────────────
  useEffect(() => {
    setControls(
      <>
        <ErrorMessage message={error} />
      </>,
    );
  }, [setControls, error]);

  useEffect(() => {
    return () => {
      setControls(null);
      setTitleBadge(null);
    };
  }, [setControls, setTitleBadge]);

  useEffect(() => {
    if (stats) setTitleBadge(formatNumber(stats.totalCalls));
  }, [setTitleBadge, stats]);

  // ── Column definitions (stable) ────────────────────────────
  const toolColumns = useMemo(() => getToolColumns(), []);
  const domainColumns = useMemo(() => getDomainColumns(), []);
  const slowestColumns = useMemo(() => getSlowestColumns(), []);

  // ── Sorted data ────────────────────────────────────────────
  const sortedTools = useMemo(() => {
    if (!stats?.byTool) return [];
    const arr = [...stats.byTool];
    arr.sort((a, b) => {
      const mult = toolOrder === "desc" ? -1 : 1;
      if (toolSort === "toolName") return mult * a.toolName.localeCompare(b.toolName);
      return mult * ((a[toolSort] || 0) - (b[toolSort] || 0));
    });
    return arr;
  }, [stats, toolSort, toolOrder]);

  const sortedDomains = useMemo(() => {
    if (!stats?.byDomain) return [];
    const arr = [...stats.byDomain];
    arr.sort((a, b) => {
      const mult = domainOrder === "desc" ? -1 : 1;
      if (domainSort === "domain") return mult * (a.domain || "").localeCompare(b.domain || "");
      return mult * ((a[domainSort] || 0) - (b[domainSort] || 0));
    });
    return arr;
  }, [stats, domainSort, domainOrder]);

  // ── Derived computed stats ─────────────────────────────────
  const avgLatencyAll = useMemo(() => {
    if (!stats?.byTool?.length) return 0;
    const totalMs = stats.byTool.reduce((sum, t) => sum + t.avgMs * t.count, 0);
    return totalMs / stats.totalCalls;
  }, [stats]);

  const topDomain = useMemo(() => {
    if (!stats?.byDomain?.length) return "—";
    return stats.byDomain[0].domain;
  }, [stats]);

  if (loading && !stats) {
    return <div className={styles.page}><div className={styles.loadingState}>Loading tool call statistics…</div></div>;
  }

  return (
    <div className={styles.page}>
      {/* ── Summary Cards ── */}
      <div className={styles.summaryGrid}>
        <div className={styles.statCard}>
          <div className={styles.statIcon}>
            <BarChart3 size={20} />
          </div>
          <div className={styles.statContent}>
            <span className={styles.statValue}>
              {formatNumber(stats?.totalCalls || 0)}
            </span>
            <span className={styles.statLabel}>Total Calls</span>
          </div>
        </div>

        <div className={styles.statCard}>
          <div className={`${styles.statIcon} ${styles.successIcon}`}>
            <CheckCircle size={20} />
          </div>
          <div className={styles.statContent}>
            <span className={styles.statValue}>
              {stats?.successRate ?? 0}%
            </span>
            <span className={styles.statLabel}>Success Rate</span>
          </div>
        </div>

        <div className={styles.statCard}>
          <div className={`${styles.statIcon} ${styles.latencyIcon}`}>
            <Clock size={20} />
          </div>
          <div className={styles.statContent}>
            <span className={styles.statValue}>
              {formatLatency(avgLatencyAll / 1000)}
            </span>
            <span className={styles.statLabel}>Avg Latency</span>
          </div>
        </div>

        <div className={styles.statCard}>
          <div className={`${styles.statIcon} ${styles.domainIcon}`}>
            <Activity size={20} />
          </div>
          <div className={styles.statContent}>
            <span className={styles.statValue}>{topDomain}</span>
            <span className={styles.statLabel}>Top Domain</span>
          </div>
        </div>
      </div>

      {/* ── Per-Tool Statistics ── */}
      <section className={styles.section}>
        <h2 className={styles.sectionTitle}>
          <Zap size={16} /> Per-Tool Statistics
        </h2>
        <TableComponent
          columns={toolColumns}
          data={sortedTools}
          sortKey={toolSort}
          sortDir={toolOrder}
          onSort={(key, dir) => {
            setToolSort(key);
            setToolOrder(dir);
          }}
          getRowKey={(r) => r.toolName}
          emptyText="No tool data"
          maxHeight={null}
          storageKey="tool-calls-by-tool"
        />
      </section>

      {/* ── Domain Breakdown ── */}
      <section className={styles.section}>
        <h2 className={styles.sectionTitle}>
          <Activity size={16} /> Domain Breakdown
        </h2>
        <TableComponent
          columns={domainColumns}
          data={sortedDomains}
          sortKey={domainSort}
          sortDir={domainOrder}
          onSort={(key, dir) => {
            setDomainSort(key);
            setDomainOrder(dir);
          }}
          getRowKey={(r) => r.domain}
          emptyText="No domain data"
          maxHeight={null}
          storageKey="tool-calls-by-domain"
        />
      </section>

      {/* ── Slowest Calls ── */}
      {stats?.slowest?.length > 0 && (
        <section className={styles.section}>
          <h2 className={styles.sectionTitle}>
            <Clock size={16} /> Top 10 Slowest Calls
          </h2>
          <TableComponent
            columns={slowestColumns}
            data={stats.slowest}
            getRowKey={(r, i) => r._id || i}
            emptyText="No data"
            maxHeight={null}
            storageKey="tool-calls-slowest"
          />
        </section>
      )}

      {/* ── Error Breakdown ── */}
      {stats?.errorsByTool?.length > 0 && (
        <section className={styles.section}>
          <h2 className={`${styles.sectionTitle} ${styles.errorTitle}`}>
            <AlertTriangle size={16} /> Errors by Tool
          </h2>
          <div className={styles.errorGrid}>
            {stats.errorsByTool.map((err) => (
              <div key={err._id} className={styles.errorCard}>
                <div className={styles.errorCardHeader}>
                  <BadgeComponent variant="provider">{err._id}</BadgeComponent>
                  <span className={styles.errorCardCount}>
                    {err.errorCount} error{err.errorCount !== 1 ? "s" : ""}
                  </span>
                </div>
                {err.lastError && (
                  <div className={styles.errorCardMessage}>
                    {err.lastError}
                  </div>
                )}
                {err.lastErrorAt && (
                  <div className={styles.errorCardTime}>
                    Last: {formatDateTime(err.lastErrorAt)}
                  </div>
                )}
              </div>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
