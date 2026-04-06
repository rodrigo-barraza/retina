"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import { useRouter } from "next/navigation";
import { BarChart3, Coins, Loader2 } from "lucide-react";
import PrismService from "../services/PrismService";
import ThreePanelLayout from "./ThreePanelLayout";
import SummaryBarComponent from "./SummaryBarComponent";
import BenchmarkDashboardTableComponent from "./BenchmarkDashboardTableComponent";
import EmptyStateComponent from "./EmptyStateComponent";
import ButtonComponent from "./ButtonComponent";
import { formatCost } from "../utils/utilities";
import styles from "./BenchmarkDashboardComponent.module.css";

export default function BenchmarkDashboardComponent({ navSidebar, rightSidebar }) {
  const router = useRouter();
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);

  // ── Load stats ────────────────────────────────────────────
  const loadStats = useCallback(async () => {
    try {
      const data = await PrismService.getBenchmarkStats();
      setStats(data);
    } catch (err) {
      console.error("Failed to load benchmark stats:", err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadStats();
  }, [loadStats]);

  // ── Aggregate totals ──────────────────────────────────────
  const totals = useMemo(() => {
    if (!stats?.models) return null;
    return stats.models.reduce(
      (acc, m) => ({
        total: acc.total + m.total,
        passed: acc.passed + m.passed,
        failed: acc.failed + m.failed,
        errored: acc.errored + m.errored,
        cost: acc.cost + m.totalCost,
      }),
      { total: 0, passed: 0, failed: 0, errored: 0, cost: 0 },
    );
  }, [stats]);

  // ── Render ────────────────────────────────────────────────
  return (
    <ThreePanelLayout
      navSidebar={navSidebar}
      leftPanel={null}
      rightPanel={rightSidebar}
      rightTitle="Benchmarks"
      headerTitle="Benchmarks"
      headerControls={
        <ButtonComponent
          variant="primary"
          size="sm"
          onClick={() => router.push("/benchmarks/new")}
        >
          New Benchmark
        </ButtonComponent>
      }
    >
      <div className={styles.container}>
        {loading ? (
          <div className={styles.loadingState}>
            <Loader2 size={20} className={styles.spinIcon} />
            <span>Loading benchmark stats…</span>
          </div>
        ) : !stats || stats.models.length === 0 ? (
          <EmptyStateComponent
            icon={<BarChart3 size={36} />}
            title="No Benchmark Data Yet"
            subtitle="Run benchmarks against your models to see performance stats here."
          >
            <ButtonComponent
              variant="primary"
              size="sm"
              onClick={() => router.push("/benchmarks/new")}
            >
              Create Benchmark
            </ButtonComponent>
          </EmptyStateComponent>
        ) : (
          <>
            {/* ── Summary Bar ──────────────────────── */}
            <SummaryBarComponent
              items={[
                { value: stats.totalModels, label: "Models Tested" },
                { value: stats.totalBenchmarks, label: "Benchmarks" },
                { value: totals.total, label: "Total Tests" },
                { value: totals.passed, label: "Passed", color: "var(--success)" },
                { value: totals.failed + totals.errored, label: "Failed", color: "var(--danger)" },
                {
                  bar: totals.total > 0 ? (totals.passed / totals.total) * 100 : 0,
                  label: totals.total > 0 ? `${Math.round((totals.passed / totals.total) * 100)}%` : "—",
                },
                ...(totals.cost > 0
                  ? [{
                      value: formatCost(totals.cost),
                      label: "Total Cost",
                      color: "var(--success)",
                      icon: <Coins size={14} />,
                    }]
                  : []),
              ]}
            />

            {/* ── Model Performance Table ──────────── */}
            <BenchmarkDashboardTableComponent
              models={stats.models}
            />
          </>
        )}
      </div>
    </ThreePanelLayout>
  );
}

