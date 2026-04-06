"use client";

import { useState, useEffect, useRef, useCallback, useMemo } from "react";
import { Monitor } from "lucide-react";
import Chart from "chart.js/auto";
import PrismService from "../services/PrismService";
import styles from "./VramBenchmarkComponent.module.css";

// ── Color palette ────────────────────────────────────────────

const QUANT_COLORS = {
  Q4_0: { bg: "rgba(34,211,238,0.75)", border: "#22d3ee" },
  Q4_K_M: { bg: "rgba(99,102,241,0.75)", border: "#6366f1" },
  Q4_K_S: { bg: "rgba(139,92,246,0.75)", border: "#8b5cf6" },
  Q4_1: { bg: "rgba(59,130,246,0.75)", border: "#3b82f6" },
  Q5_K_S: { bg: "rgba(16,185,129,0.75)", border: "#10b981" },
  Q6_K_L: { bg: "rgba(245,158,11,0.75)", border: "#f59e0b" },
  Q8_0: { bg: "rgba(244,63,94,0.75)", border: "#f43f5e" },
  Q3_K_L: { bg: "rgba(249,115,22,0.75)", border: "#f97316" },
  FP16: { bg: "rgba(236,72,153,0.75)", border: "#ec4899" },
  F16: { bg: "rgba(236,72,153,0.75)", border: "#ec4899" },
};

const GPU_COLORS = {
  "NVIDIA GeForce RTX 4090": {
    bg: "rgba(99,102,241,0.75)",
    border: "#6366f1",
  },
  "NVIDIA GeForce RTX 5070 Ti": {
    bg: "rgba(16,185,129,0.75)",
    border: "#10b981",
  },
};

function getQuantColor(q) {
  return QUANT_COLORS[q] || { bg: "rgba(107,114,128,0.7)", border: "#6b7280" };
}

function getGPUColor(gpuName) {
  return (
    GPU_COLORS[gpuName] || { bg: "rgba(107,114,128,0.7)", border: "#6b7280" }
  );
}

function shortGPU(name) {
  return (name || "Unknown")
    .replace("NVIDIA GeForce ", "")
    .replace("NVIDIA ", "");
}

// ── Chart defaults ───────────────────────────────────────────

const TOOLTIP_STYLE = {
  backgroundColor: "rgba(18, 20, 29, 0.95)",
  titleColor: "#e8eaf0",
  bodyColor: "#8b8fa8",
  borderColor: "rgba(99, 102, 241, 0.3)",
  borderWidth: 1,
  padding: 14,
  cornerRadius: 4,
  titleFont: { weight: "600", size: 13 },
  bodyFont: { size: 12 },
  displayColors: true,
  boxPadding: 4,
};

// ═════════════════════════════════════════════════════════════
// Component
// ═════════════════════════════════════════════════════════════

export default function VramBenchmarkComponent() {
  const [rawData, setRawData] = useState([]);
  const [machines, setMachines] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Filters
  const [machineFilter, setMachineFilter] = useState("all");
  const [ctxFilter, setCtxFilter] = useState("4096");
  const [sortBy, setSortBy] = useState("vram");

  const scatterRef = useRef(null);
  const barRef = useRef(null);
  const scatterChartRef = useRef(null);
  const barChartRef = useRef(null);

  // ── Fetch data ───────────────────────────────────────────

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const [benchRes, machinesRes] = await Promise.all([
          PrismService.getVramBenchmarks({ settings: "default" }),
          PrismService.getVramBenchmarkMachines(),
        ]);
        if (cancelled) return;
        setRawData(benchRes.data || []);
        setMachines(machinesRes || []);
      } catch (err) {
        if (!cancelled) setError(err.message);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  // ── Process data ─────────────────────────────────────────

  const models = useMemo(() => {
    let filtered = rawData.filter(
      (d) => d.tokensPerSecond > 0 && d.modelVramGiB > 0,
    );

    if (machineFilter !== "all") {
      filtered = filtered.filter(
        (d) => (d.system?.hostname || "unknown") === machineFilter,
      );
    }

    if (ctxFilter !== "all") {
      filtered = filtered.filter(
        (d) => d.contextLength === parseInt(ctxFilter),
      );
    }

    // Deduplicate: one per model (prefer higher context)
    const byModel = {};
    for (const d of filtered) {
      const key = d.displayName;
      if (!byModel[key] || d.contextLength > byModel[key].contextLength) {
        byModel[key] = d;
      }
    }

    let result = Object.values(byModel);

    switch (sortBy) {
      case "tps":
        result.sort((a, b) => b.tokensPerSecond - a.tokensPerSecond);
        break;
      case "efficiency":
        result.sort(
          (a, b) =>
            b.tokensPerSecond / b.modelVramGiB -
            a.tokensPerSecond / a.modelVramGiB,
        );
        break;
      case "filesize":
        result.sort((a, b) => a.fileSizeGB - b.fileSizeGB);
        break;
      default:
        result.sort((a, b) => a.modelVramGiB - b.modelVramGiB);
    }

    return result;
  }, [rawData, machineFilter, ctxFilter, sortBy]);

  // ── Stats ────────────────────────────────────────────────

  const stats = useMemo(() => {
    if (models.length === 0) return null;
    const n = models.length;
    const avgVram = (
      models.reduce((s, m) => s + m.modelVramGiB, 0) / n
    ).toFixed(1);
    const maxTps = Math.max(...models.map((m) => m.tokensPerSecond)).toFixed(0);
    const avgDelta = (
      models.reduce(
        (s, m) => s + Math.abs(m.modelVramGiB - m.estimatedGiB),
        0,
      ) / n
    ).toFixed(2);
    const fastest = models.reduce((best, m) =>
      m.tokensPerSecond > best.tokensPerSecond ? m : best,
    );
    return { n, avgVram, maxTps, avgDelta, fastest };
  }, [models]);

  // ── HW badge label ───────────────────────────────────────

  const hwLabel = useMemo(() => {
    if (machineFilter === "all") {
      return machines
        .map((m) => `${shortGPU(m.gpu)} ${m.gpuVramGB} GB`)
        .join(" · ");
    }
    const m = machines.find((x) => x.hostname === machineFilter);
    return m ? `${shortGPU(m.gpu)} ${m.gpuVramGB} GB` : "Unknown";
  }, [machines, machineFilter]);

  // ── Render scatter chart ─────────────────────────────────

  const renderScatter = useCallback(() => {
    if (!scatterRef.current || models.length === 0) return;
    if (scatterChartRef.current) scatterChartRef.current.destroy();

    const ctx = scatterRef.current.getContext("2d");
    let datasets;

    if (machineFilter === "all") {
      const gpuGroups = {};
      for (const m of models) {
        const gpu = m.system?.gpu?.name || "Unknown";
        if (!gpuGroups[gpu]) gpuGroups[gpu] = [];
        gpuGroups[gpu].push(m);
      }
      datasets = Object.entries(gpuGroups).map(([gpu, items]) => {
        const color = getGPUColor(gpu);
        return {
          label: shortGPU(gpu),
          data: items.map((m) => ({
            x: m.modelVramGiB,
            y: m.tokensPerSecond,
            r: Math.max(5, Math.min(22, Math.sqrt(m.fileSizeGB) * 5)),
            model: m,
          })),
          backgroundColor: color.bg,
          borderColor: color.border,
          borderWidth: 1.5,
          hoverBorderWidth: 3,
          hoverBorderColor: "#fff",
        };
      });
    } else {
      const quantGroups = {};
      for (const m of models) {
        const q = m.quantization || "unknown";
        if (!quantGroups[q]) quantGroups[q] = [];
        quantGroups[q].push(m);
      }
      datasets = Object.entries(quantGroups).map(([q, items]) => {
        const color = getQuantColor(q);
        return {
          label: q,
          data: items.map((m) => ({
            x: m.modelVramGiB,
            y: m.tokensPerSecond,
            r: Math.max(5, Math.min(22, Math.sqrt(m.fileSizeGB) * 5)),
            model: m,
          })),
          backgroundColor: color.bg,
          borderColor: color.border,
          borderWidth: 1.5,
          hoverBorderWidth: 3,
          hoverBorderColor: "#fff",
        };
      });
    }

    scatterChartRef.current = new Chart(ctx, {
      type: "bubble",
      data: { datasets },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        animation: { duration: 500, easing: "easeOutQuart" },
        interaction: { mode: "nearest", intersect: true },
        scales: {
          x: {
            title: {
              display: true,
              text: "VRAM Usage (GiB)",
              font: { weight: "600", size: 12 },
              color: "var(--text-secondary)",
            },
            grid: { color: "rgba(255,255,255,0.04)" },
            ticks: { font: { size: 11 } },
            min: 0,
          },
          y: {
            title: {
              display: true,
              text: "Tokens / sec",
              font: { weight: "600", size: 12 },
              color: "var(--text-secondary)",
            },
            grid: { color: "rgba(255,255,255,0.04)" },
            ticks: { font: { size: 11 } },
            min: 0,
          },
        },
        plugins: {
          legend: {
            position: "top",
            labels: {
              usePointStyle: true,
              pointStyle: "circle",
              padding: 14,
              font: { size: 11, weight: "500" },
            },
          },
          tooltip: {
            ...TOOLTIP_STYLE,
            callbacks: {
              title: (items) => items[0]?.raw?.model?.displayName || "",
              label: (item) => {
                const m = item.raw.model;
                return [
                  `GPU: ${shortGPU(m.system?.gpu?.name)}`,
                  `VRAM: ${m.modelVramGiB.toFixed(2)} GiB (est: ${m.estimatedGiB.toFixed(2)})`,
                  `Speed: ${m.tokensPerSecond.toFixed(1)} tok/s`,
                  `File: ${m.fileSizeGB.toFixed(1)} GB · ${m.quantization}`,
                  `Context: ${(m.contextLength / 1024).toFixed(0)}K`,
                  `Efficiency: ${(m.tokensPerSecond / m.modelVramGiB).toFixed(1)} TPS/GiB`,
                ];
              },
            },
          },
        },
      },
    });
  }, [models, machineFilter]);

  // ── Render bar chart ─────────────────────────────────────

  const renderBar = useCallback(() => {
    if (!barRef.current || models.length === 0) return;
    if (barChartRef.current) barChartRef.current.destroy();

    const ctx = barRef.current.getContext("2d");

    const labels = models.map((m) => {
      const name = m.displayName;
      return name.length > 30 ? name.slice(0, 28) + "…" : name;
    });

    // Dynamic height
    barRef.current.parentElement.style.height =
      Math.max(400, models.length * 24 + 80) + "px";

    barChartRef.current = new Chart(ctx, {
      type: "bar",
      data: {
        labels,
        datasets: [
          {
            label: "Measured VRAM (GiB)",
            data: models.map((m) => m.modelVramGiB),
            backgroundColor: models.map(
              (m) => getQuantColor(m.quantization).bg,
            ),
            borderColor: models.map(
              (m) => getQuantColor(m.quantization).border,
            ),
            borderWidth: 1.5,
            borderRadius: 2,
            hoverBorderWidth: 2.5,
            hoverBorderColor: "#fff",
          },
          {
            label: "Estimated VRAM (GiB)",
            data: models.map((m) => m.estimatedGiB),
            backgroundColor: "rgba(255,255,255,0.04)",
            borderColor: "rgba(255,255,255,0.2)",
            borderWidth: 1.5,
            borderRadius: 2,
            borderDash: [4, 3],
          },
        ],
      },
      options: {
        indexAxis: "y",
        responsive: true,
        maintainAspectRatio: false,
        animation: { duration: 600, easing: "easeOutQuart" },
        interaction: { mode: "index", intersect: false },
        scales: {
          x: {
            title: {
              display: true,
              text: "VRAM (GiB)",
              font: { weight: "600", size: 12 },
              color: "var(--text-secondary)",
            },
            grid: { color: "rgba(255,255,255,0.04)" },
            ticks: { font: { size: 11 } },
            max: 24,
          },
          y: {
            grid: { display: false },
            ticks: {
              font: { size: 11, weight: "500" },
              color: "var(--text-secondary)",
              padding: 8,
            },
          },
        },
        plugins: {
          legend: {
            position: "top",
            labels: {
              usePointStyle: true,
              pointStyle: "rect",
              padding: 14,
              font: { size: 11, weight: "500" },
            },
          },
          tooltip: {
            ...TOOLTIP_STYLE,
            callbacks: {
              title: (items) =>
                models[items[0]?.dataIndex]?.displayName || "",
              afterTitle: (items) => {
                const m = models[items[0]?.dataIndex];
                if (!m) return "";
                return `${m.quantization} · ${m.architecture} · ${(m.contextLength / 1024).toFixed(0)}K ctx · ${shortGPU(m.system?.gpu?.name)}`;
              },
              label: (item) => {
                const m = models[item.dataIndex];
                if (item.datasetIndex === 0) {
                  return ` Measured: ${m.modelVramGiB.toFixed(2)} GiB`;
                }
                const delta = m.modelVramGiB - m.estimatedGiB;
                return ` Estimated: ${m.estimatedGiB.toFixed(2)} GiB (Δ ${delta >= 0 ? "+" : ""}${delta.toFixed(2)})`;
              },
              afterBody: (items) => {
                const m = models[items[0]?.dataIndex];
                if (!m) return "";
                return [
                  "",
                  `Speed: ${m.tokensPerSecond.toFixed(1)} tok/s`,
                  `File: ${m.fileSizeGB.toFixed(1)} GB`,
                  `Efficiency: ${(m.tokensPerSecond / m.modelVramGiB).toFixed(1)} TPS/GiB`,
                ];
              },
            },
          },
        },
      },
    });
  }, [models]);

  // ── Render charts on data change ─────────────────────────

  useEffect(() => {
    if (loading || error) return;

    // Chart.js global defaults
    Chart.defaults.color = "#8b8fa8";
    Chart.defaults.borderColor = "rgba(255,255,255,0.05)";
    Chart.defaults.font.family = "'Inter', sans-serif";

    renderScatter();
    renderBar();

    return () => {
      if (scatterChartRef.current) scatterChartRef.current.destroy();
      if (barChartRef.current) barChartRef.current.destroy();
    };
  }, [loading, error, renderScatter, renderBar]);

  // ── Loading ──────────────────────────────────────────────

  if (loading) {
    return (
      <div className={styles.container}>
        <div className={styles.loadingState}>
          <div className={styles.spinner} />
          Fetching VRAM benchmarks…
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className={styles.container}>
        <div className={styles.errorState}>
          <strong>Failed to load benchmarks</strong>
          <span>{error}</span>
        </div>
      </div>
    );
  }

  // ── Render ───────────────────────────────────────────────

  return (
    <div className={styles.container}>
      {/* Header */}
      <div className={styles.header}>
        <h1 className={styles.title}>VRAM Benchmark</h1>
        <p className={styles.subtitle}>
          GPU memory profiling for locally-served models — measured vs. estimated
        </p>
        <div className={styles.hwBadge}>
          <Monitor size={13} />
          {hwLabel || "Loading…"}
        </div>
      </div>

      {/* Stats strip */}
      <div className={styles.statsStrip}>
        {stats ? (
          <>
            <div className={styles.statPill}>
              <span className={styles.statValue}>{stats.n}</span>
              <span className={styles.statLabel}>Models</span>
            </div>
            <div className={styles.statPill}>
              <span className={styles.statValue}>{stats.avgVram}</span>
              <span className={styles.statLabel}>Avg VRAM (GiB)</span>
            </div>
            <div className={styles.statPill}>
              <span className={styles.statValue}>{stats.maxTps}</span>
              <span className={styles.statLabel}>Peak TPS</span>
            </div>
            <div className={styles.statPill}>
              <span className={styles.statValue}>±{stats.avgDelta}</span>
              <span className={styles.statLabel}>Avg Est. Error (GiB)</span>
            </div>
            <div className={styles.statPill}>
              <span
                className={styles.statValue}
                style={{ fontSize: "0.88rem" }}
              >
                {stats.fastest.displayName
                  .replace(/ /g, "\u00a0")
                  .slice(0, 22)}
              </span>
              <span className={styles.statLabel}>Fastest Model</span>
            </div>
          </>
        ) : (
          <div className={styles.statPill}>
            <span className={styles.statValue}>—</span>
            <span className={styles.statLabel}>No Data</span>
          </div>
        )}
      </div>

      {/* Controls */}
      <div className={styles.controls}>
        <div className={styles.controlGroup}>
          <label>Machine</label>
          <select
            value={machineFilter}
            onChange={(e) => setMachineFilter(e.target.value)}
          >
            <option value="all">All Machines</option>
            {machines.map((m) => (
              <option key={m.hostname} value={m.hostname}>
                {shortGPU(m.gpu)} ({m.benchmarkCount} runs)
              </option>
            ))}
          </select>
        </div>
        <div className={styles.controlGroup}>
          <label>Context</label>
          <select
            value={ctxFilter}
            onChange={(e) => setCtxFilter(e.target.value)}
          >
            <option value="all">All</option>
            <option value="2048">2K</option>
            <option value="4096">4K</option>
            <option value="8192">8K</option>
            <option value="16384">16K</option>
          </select>
        </div>
        <div className={styles.controlGroup}>
          <label>Sort</label>
          <select value={sortBy} onChange={(e) => setSortBy(e.target.value)}>
            <option value="vram">VRAM Usage</option>
            <option value="tps">Tokens/sec</option>
            <option value="efficiency">Efficiency</option>
            <option value="filesize">File Size</option>
          </select>
        </div>
      </div>

      {/* Charts */}
      <div className={styles.chartsGrid}>
        <div className={styles.chartCard}>
          <h2 className={styles.chartTitle}>VRAM vs. Inference Speed</h2>
          <p className={styles.chartSubtitle}>
            Each dot is a model — size indicates file weight, position reveals
            the VRAM/throughput trade-off
          </p>
          <div className={styles.chartWrapper} style={{ height: 420 }}>
            <canvas ref={scatterRef} />
          </div>
        </div>

        <div className={styles.chartCard}>
          <h2 className={styles.chartTitle}>VRAM Consumption by Model</h2>
          <p className={styles.chartSubtitle}>
            Measured GPU VRAM (solid) vs. estimated (outline) — default load
            settings
          </p>
          <div className={styles.chartWrapper}>
            <canvas ref={barRef} />
          </div>
        </div>
      </div>
    </div>
  );
}
