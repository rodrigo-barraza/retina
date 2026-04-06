"use client";

import { useState, useEffect, useRef, useCallback, useMemo } from "react";
import {
  Monitor,
  Cpu,
  Zap,
  BarChart3,
  TrendingUp,
  HardDrive,
  RefreshCw,
  Layers,
} from "lucide-react";
import Chart from "chart.js/auto";
import PrismService from "../services/PrismService";
import PageHeaderComponent from "./PageHeaderComponent";
import StatsCard from "./StatsCard";
import TabBarComponent from "./TabBarComponent";
import {
  FilterBarComponent,
  FilterSelectComponent,
} from "./FilterBarComponent";
import { LoadingMessage, ErrorMessage } from "./StateMessageComponent";
import styles from "./VramBenchmarkComponent.module.css";

// ── Color palette ────────────────────────────────────────────

const QUANT_COLORS = {
  Q4_0: { bg: "rgba(34,211,238,0.55)", border: "#22d3ee" },
  Q4_K_M: { bg: "rgba(99,102,241,0.55)", border: "#6366f1" },
  Q4_K_S: { bg: "rgba(139,92,246,0.55)", border: "#8b5cf6" },
  Q4_1: { bg: "rgba(59,130,246,0.55)", border: "#3b82f6" },
  Q5_K_S: { bg: "rgba(16,185,129,0.55)", border: "#10b981" },
  Q5_K_M: { bg: "rgba(20,184,166,0.55)", border: "#14b8a6" },
  Q6_K: { bg: "rgba(234,179,8,0.55)", border: "#eab308" },
  Q6_K_L: { bg: "rgba(245,158,11,0.55)", border: "#f59e0b" },
  Q8_0: { bg: "rgba(244,63,94,0.55)", border: "#f43f5e" },
  Q3_K_L: { bg: "rgba(249,115,22,0.55)", border: "#f97316" },
  FP16: { bg: "rgba(236,72,153,0.55)", border: "#ec4899" },
  F16: { bg: "rgba(236,72,153,0.55)", border: "#ec4899" },
  BF16: { bg: "rgba(217,70,239,0.55)", border: "#d946ef" },
};

const GPU_COLORS = {
  "NVIDIA GeForce RTX 4090": {
    bg: "rgba(99,102,241,0.6)",
    border: "#6366f1",
  },
  "NVIDIA GeForce RTX 5070 Ti": {
    bg: "rgba(16,185,129,0.6)",
    border: "#10b981",
  },
};

// Fallback rainbow for unknown quant/GPU
const PALETTE = [
  { bg: "rgba(99,102,241,0.55)", border: "#6366f1" },
  { bg: "rgba(16,185,129,0.55)", border: "#10b981" },
  { bg: "rgba(245,158,11,0.55)", border: "#f59e0b" },
  { bg: "rgba(244,63,94,0.55)", border: "#f43f5e" },
  { bg: "rgba(59,130,246,0.55)", border: "#3b82f6" },
  { bg: "rgba(139,92,246,0.55)", border: "#8b5cf6" },
  { bg: "rgba(236,72,153,0.55)", border: "#ec4899" },
  { bg: "rgba(34,211,238,0.55)", border: "#22d3ee" },
];

let colorIdx = 0;
function getQuantColor(q) {
  if (QUANT_COLORS[q]) return QUANT_COLORS[q];
  const c = PALETTE[colorIdx % PALETTE.length];
  colorIdx++;
  return c;
}

function getGPUColor(gpuName) {
  return (
    GPU_COLORS[gpuName] || { bg: "rgba(107,114,128,0.5)", border: "#6b7280" }
  );
}

function shortGPU(name) {
  return (name || "Unknown")
    .replace("NVIDIA GeForce ", "")
    .replace("NVIDIA ", "");
}

function shortModelName(name, max = 18) {
  if (!name) return "";
  // Strip common prefixes for brevity
  let short = name
    .replace(/^(lmstudio-community|lmstudio-ai|bartowski|unsloth)\//, "")
    .replace(/-GGUF$/i, "")
    .replace(/-[A-Z]\d+.*$/, ""); // strip quant suffix like -Q4_K_M
  if (short.length > max) short = short.slice(0, max - 1) + "…";
  return short;
}

// ── Chart defaults ───────────────────────────────────────────

const CHART_FONT = "'Inter', sans-serif";

const TOOLTIP_STYLE = {
  backgroundColor: "rgba(10, 10, 15, 0.92)",
  titleColor: "#f8f8f8",
  bodyColor: "#8e95ae",
  borderColor: "rgba(99, 102, 241, 0.25)",
  borderWidth: 1,
  padding: 14,
  cornerRadius: 2,
  titleFont: { family: CHART_FONT, weight: "600", size: 13 },
  bodyFont: { family: CHART_FONT, size: 12 },
  displayColors: true,
  boxPadding: 4,
};

const GRID_STYLE = {
  color: "rgba(255,255,255,0.04)",
  drawBorder: false,
};

const TICK_STYLE = {
  font: { family: CHART_FONT, size: 11, weight: "500" },
  color: "#6b728e",
  padding: 6,
};

const AXIS_TITLE_STYLE = {
  display: true,
  font: { family: CHART_FONT, weight: "600", size: 12 },
  color: "#8e95ae",
  padding: { top: 8 },
};

const LEGEND_STYLE = {
  position: "top",
  labels: {
    usePointStyle: true,
    pointStyle: "circle",
    padding: 16,
    font: { family: CHART_FONT, size: 11, weight: "500" },
    color: "#8e95ae",
    boxWidth: 8,
    boxHeight: 8,
  },
};

// ── Custom inline datalabels plugin ──────────────────────────
// Draws model name labels directly on chart data points.
// Works per-chart without global registration issues.

function makeDatalabelsPlugin({ getLabel, anchor = "end", align = "top", offset = 4, filterFn, maxLabels = 60 }) {
  return {
    id: "customDatalabels",
    afterDatasetsDraw(chart) {
      const { ctx } = chart;
      ctx.save();
      ctx.font = `500 9px ${CHART_FONT}`;
      ctx.fillStyle = "rgba(142, 149, 174, 0.85)";
      ctx.textBaseline = align === "top" ? "bottom" : "middle";

      let labelCount = 0;
      for (let di = 0; di < chart.data.datasets.length; di++) {
        if (filterFn && !filterFn(di)) continue;
        const meta = chart.getDatasetMeta(di);
        if (!meta.visible) continue;
        for (let i = 0; i < meta.data.length; i++) {
          if (labelCount >= maxLabels) break;
          const el = meta.data[i];
          const raw = chart.data.datasets[di].data[i];
          const label = getLabel(raw, i, di);
          if (!label) continue;

          let x = el.x;
          let y = el.y;

          if (anchor === "end" && align === "top") {
            y = y - (el.height || el.options?.radius || 6) - offset;
            ctx.textAlign = "center";
          } else if (anchor === "end" && align === "right") {
            x = x + offset;
            ctx.textAlign = "left";
            ctx.textBaseline = "middle";
          }

          ctx.fillText(label, x, y);
          labelCount++;
        }
      }
      ctx.restore();
    },
  };
}

// ── View tabs ────────────────────────────────────────────────

const VIEW_TABS = [
  { key: "scatter", label: "VRAM vs Speed", icon: <TrendingUp size={12} /> },
  { key: "bar", label: "VRAM Usage", icon: <BarChart3 size={12} /> },
  { key: "efficiency", label: "Efficiency", icon: <Zap size={12} /> },
  { key: "quantDist", label: "Quantization", icon: <Layers size={12} /> },
  { key: "context", label: "Context Scaling", icon: <HardDrive size={12} /> },
];

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
  const [providerFilter, setProviderFilter] = useState("all");
  const [ctxFilter, setCtxFilter] = useState("4096");
  const [sortBy, setSortBy] = useState("vram");
  const [activeView, setActiveView] = useState("scatter");

  // Canvas refs — one per chart type
  const chartRefs = {
    scatter: useRef(null),
    bar: useRef(null),
    efficiency: useRef(null),
    quantDist: useRef(null),
    context: useRef(null),
  };
  const chartInstances = useRef({});

  // ── Fetch data ───────────────────────────────────────────

  const fetchData = useCallback(async () => {
    try {
      setError(null);
      const [benchRes, machinesRes] = await Promise.all([
        PrismService.getVramBenchmarks({ settings: "default" }),
        PrismService.getVramBenchmarkMachines(),
      ]);
      setRawData(benchRes.data || []);
      setMachines(machinesRes || []);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // ── Distinct context lengths from data ──────────────────

  const contextOptions = useMemo(() => {
    const set = new Set(rawData.map((d) => d.contextLength));
    return [...set].sort((a, b) => a - b);
  }, [rawData]);

  // ── Distinct providers from data ────────────────────────

  const providerOptions = useMemo(() => {
    const set = new Set(rawData.map((d) => d.provider).filter(Boolean));
    return [...set].sort();
  }, [rawData]);

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

    if (providerFilter !== "all") {
      filtered = filtered.filter((d) => d.provider === providerFilter);
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

    const result = Object.values(byModel);

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
  }, [rawData, machineFilter, providerFilter, ctxFilter, sortBy]);

  // ── All filtered data (including all context per model for context chart) ─

  const allFilteredData = useMemo(() => {
    let filtered = rawData.filter(
      (d) => d.tokensPerSecond > 0 && d.modelVramGiB > 0,
    );
    if (machineFilter !== "all") {
      filtered = filtered.filter(
        (d) => (d.system?.hostname || "unknown") === machineFilter,
      );
    }
    if (providerFilter !== "all") {
      filtered = filtered.filter((d) => d.provider === providerFilter,
      );
    }
    return filtered;
  }, [rawData, machineFilter, providerFilter]);

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
    const avgEfficiency = (
      models.reduce((s, m) => s + m.tokensPerSecond / m.modelVramGiB, 0) / n
    ).toFixed(1);
    return { n, avgVram, maxTps, avgDelta, fastest, avgEfficiency };
  }, [models]);

  // ── HW label ─────────────────────────────────────────────

  const hwLabel = useMemo(() => {
    if (machineFilter === "all") {
      return machines
        .map((m) => `${shortGPU(m.gpu)} ${m.gpuVramGB} GB`)
        .join(" · ");
    }
    const m = machines.find((x) => x.hostname === machineFilter);
    return m ? `${shortGPU(m.gpu)} ${m.gpuVramGB} GB` : "Unknown";
  }, [machines, machineFilter]);

  // ── Chart render helpers ─────────────────────────────────

  function destroyChart(key) {
    if (chartInstances.current[key]) {
      chartInstances.current[key].destroy();
      chartInstances.current[key] = null;
    }
  }

  // ── Scatter (VRAM vs Speed) ──────────────────────────────

  const renderScatter = useCallback(() => {
    const canvas = chartRefs.scatter.current;
    if (!canvas || models.length === 0) return;
    destroyChart("scatter");

    const ctx = canvas.getContext("2d");
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
            r: Math.max(5, Math.min(20, Math.sqrt(m.fileSizeGB) * 4.5)),
            model: m,
          })),
          backgroundColor: color.bg,
          borderColor: color.border,
          borderWidth: 1.5,
          hoverBorderWidth: 2.5,
          hoverBorderColor: "#f8f8f8",
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
            r: Math.max(5, Math.min(20, Math.sqrt(m.fileSizeGB) * 4.5)),
            model: m,
          })),
          backgroundColor: color.bg,
          borderColor: color.border,
          borderWidth: 1.5,
          hoverBorderWidth: 2.5,
          hoverBorderColor: "#f8f8f8",
        };
      });
    }

    chartInstances.current.scatter = new Chart(ctx, {
      type: "bubble",
      data: { datasets },
      plugins: [
        makeDatalabelsPlugin({
          getLabel: (raw) => shortModelName(raw?.model?.displayName, 16),
          anchor: "end",
          align: "top",
          offset: 4,
        }),
      ],
      options: {
        responsive: true,
        maintainAspectRatio: false,
        animation: { duration: 500, easing: "easeOutQuart" },
        interaction: { mode: "nearest", intersect: true },
        scales: {
          x: {
            title: { ...AXIS_TITLE_STYLE, text: "VRAM Usage (GiB)" },
            grid: GRID_STYLE,
            ticks: TICK_STYLE,
            min: 0,
          },
          y: {
            title: { ...AXIS_TITLE_STYLE, text: "Tokens / sec" },
            grid: GRID_STYLE,
            ticks: TICK_STYLE,
            min: 0,
          },
        },
        plugins: {
          legend: LEGEND_STYLE,
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

  // ── Bar (VRAM Consumption) ───────────────────────────────

  const renderBar = useCallback(() => {
    const canvas = chartRefs.bar.current;
    if (!canvas || models.length === 0) return;
    destroyChart("bar");

    const ctx = canvas.getContext("2d");

    const labels = models.map((m) => {
      const name = m.displayName;
      return name.length > 30 ? name.slice(0, 28) + "…" : name;
    });

    // Dynamic height
    canvas.parentElement.style.height =
      Math.max(400, models.length * 24 + 80) + "px";

    chartInstances.current.bar = new Chart(ctx, {
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
            hoverBorderColor: "#f8f8f8",
          },
          {
            label: "Estimated VRAM (GiB)",
            data: models.map((m) => m.estimatedGiB),
            backgroundColor: "rgba(255,255,255,0.03)",
            borderColor: "rgba(255,255,255,0.15)",
            borderWidth: 1,
            borderRadius: 2,
            borderDash: [4, 3],
          },
        ],
      },
      plugins: [
        makeDatalabelsPlugin({
          getLabel: (_raw, i) => {
            const m = models[i];
            return m ? `${m.modelVramGiB.toFixed(1)}G` : "";
          },
          anchor: "end",
          align: "right",
          offset: 6,
          filterFn: (di) => di === 0,
        }),
      ],
      options: {
        indexAxis: "y",
        responsive: true,
        maintainAspectRatio: false,
        animation: { duration: 600, easing: "easeOutQuart" },
        interaction: { mode: "index", intersect: false },
        scales: {
          x: {
            title: { ...AXIS_TITLE_STYLE, text: "VRAM (GiB)" },
            grid: GRID_STYLE,
            ticks: TICK_STYLE,
            max: 24,
          },
          y: {
            grid: { display: false },
            ticks: { ...TICK_STYLE, padding: 8 },
          },
        },
        plugins: {
          legend: { ...LEGEND_STYLE, labels: { ...LEGEND_STYLE.labels, pointStyle: "rect" } },
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

  // ── Efficiency (TPS / GiB ranked) ────────────────────────

  const renderEfficiency = useCallback(() => {
    const canvas = chartRefs.efficiency.current;
    if (!canvas || models.length === 0) return;
    destroyChart("efficiency");

    const ctx = canvas.getContext("2d");

    const sorted = [...models].sort(
      (a, b) =>
        b.tokensPerSecond / b.modelVramGiB -
        a.tokensPerSecond / a.modelVramGiB,
    );

    const labels = sorted.map((m) => {
      const name = m.displayName;
      return name.length > 30 ? name.slice(0, 28) + "…" : name;
    });
    const effValues = sorted.map(
      (m) => m.tokensPerSecond / m.modelVramGiB,
    );

    // Dynamic height
    canvas.parentElement.style.height =
      Math.max(400, sorted.length * 24 + 80) + "px";

    // Gradient colors based on efficiency ranking
    const maxEff = Math.max(...effValues);
    const bgColors = effValues.map((v) => {
      const ratio = v / maxEff;
      if (ratio > 0.75) return "rgba(16,185,129,0.6)";
      if (ratio > 0.5) return "rgba(99,102,241,0.6)";
      if (ratio > 0.25) return "rgba(245,158,11,0.6)";
      return "rgba(244,63,94,0.5)";
    });
    const borderColors = effValues.map((v) => {
      const ratio = v / maxEff;
      if (ratio > 0.75) return "#10b981";
      if (ratio > 0.5) return "#6366f1";
      if (ratio > 0.25) return "#f59e0b";
      return "#f43f5e";
    });

    chartInstances.current.efficiency = new Chart(ctx, {
      type: "bar",
      data: {
        labels,
        datasets: [
          {
            label: "TPS / GiB",
            data: effValues,
            backgroundColor: bgColors,
            borderColor: borderColors,
            borderWidth: 1.5,
            borderRadius: 2,
            hoverBorderWidth: 2.5,
            hoverBorderColor: "#f8f8f8",
          },
        ],
      },
      plugins: [
        makeDatalabelsPlugin({
          getLabel: (raw) => typeof raw === "number" ? `${raw.toFixed(1)}` : "",
          anchor: "end",
          align: "right",
          offset: 6,
        }),
      ],
      options: {
        indexAxis: "y",
        responsive: true,
        maintainAspectRatio: false,
        animation: { duration: 600, easing: "easeOutQuart" },
        scales: {
          x: {
            title: { ...AXIS_TITLE_STYLE, text: "Tokens/sec per GiB VRAM" },
            grid: GRID_STYLE,
            ticks: TICK_STYLE,
          },
          y: {
            grid: { display: false },
            ticks: { ...TICK_STYLE, padding: 8 },
          },
        },
        plugins: {
          legend: { display: false },
          tooltip: {
            ...TOOLTIP_STYLE,
            callbacks: {
              title: (items) => sorted[items[0]?.dataIndex]?.displayName || "",
              label: (item) => {
                const m = sorted[item.dataIndex];
                return [
                  ` Efficiency: ${(m.tokensPerSecond / m.modelVramGiB).toFixed(2)} TPS/GiB`,
                  ` Speed: ${m.tokensPerSecond.toFixed(1)} tok/s`,
                  ` VRAM: ${m.modelVramGiB.toFixed(2)} GiB`,
                  ` Quant: ${m.quantization}`,
                ];
              },
            },
          },
        },
      },
    });
  }, [models]);

  // ── Quantization Distribution ────────────────────────────

  const renderQuantDist = useCallback(() => {
    const canvas = chartRefs.quantDist.current;
    if (!canvas || models.length === 0) return;
    destroyChart("quantDist");

    const ctx = canvas.getContext("2d");

    // Group by quantization
    const quantGroups = {};
    for (const m of models) {
      const q = m.quantization || "unknown";
      if (!quantGroups[q]) quantGroups[q] = { count: 0, avgVram: 0, avgTps: 0, totalVram: 0, totalTps: 0 };
      quantGroups[q].count++;
      quantGroups[q].totalVram += m.modelVramGiB;
      quantGroups[q].totalTps += m.tokensPerSecond;
    }

    const quantLabels = Object.keys(quantGroups).sort();
    for (const q of quantLabels) {
      quantGroups[q].avgVram = quantGroups[q].totalVram / quantGroups[q].count;
      quantGroups[q].avgTps = quantGroups[q].totalTps / quantGroups[q].count;
    }

    chartInstances.current.quantDist = new Chart(ctx, {
      type: "bar",
      data: {
        labels: quantLabels,
        datasets: [
          {
            label: "Avg VRAM (GiB)",
            data: quantLabels.map((q) => quantGroups[q].avgVram),
            backgroundColor: quantLabels.map((q) => getQuantColor(q).bg),
            borderColor: quantLabels.map((q) => getQuantColor(q).border),
            borderWidth: 1.5,
            borderRadius: 2,
            yAxisID: "y",
          },
          {
            label: "Avg TPS",
            data: quantLabels.map((q) => quantGroups[q].avgTps),
            backgroundColor: "rgba(255,255,255,0.06)",
            borderColor: "rgba(255,255,255,0.25)",
            borderWidth: 1.5,
            borderRadius: 2,
            yAxisID: "y1",
          },
        ],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        animation: { duration: 600, easing: "easeOutQuart" },
        interaction: { mode: "index", intersect: false },
        scales: {
          x: {
            grid: { display: false },
            ticks: { ...TICK_STYLE, padding: 8 },
          },
          y: {
            position: "left",
            title: { ...AXIS_TITLE_STYLE, text: "Avg VRAM (GiB)" },
            grid: GRID_STYLE,
            ticks: TICK_STYLE,
          },
          y1: {
            position: "right",
            title: { ...AXIS_TITLE_STYLE, text: "Avg TPS" },
            grid: { display: false },
            ticks: TICK_STYLE,
          },
        },
        plugins: {
          legend: LEGEND_STYLE,
          tooltip: {
            ...TOOLTIP_STYLE,
            callbacks: {
              title: (items) => `${quantLabels[items[0]?.dataIndex]} Quantization`,
              afterTitle: (items) => {
                const q = quantLabels[items[0]?.dataIndex];
                return `${quantGroups[q].count} model${quantGroups[q].count > 1 ? "s" : ""}`;
              },
              label: (item) => {
                const q = quantLabels[item.dataIndex];
                const g = quantGroups[q];
                if (item.datasetIndex === 0) {
                  return ` Avg VRAM: ${g.avgVram.toFixed(2)} GiB`;
                }
                return ` Avg Speed: ${g.avgTps.toFixed(1)} tok/s`;
              },
            },
          },
        },
      },
    });
  }, [models]);

  // ── Context Length Scaling ────────────────────────────────

  const renderContext = useCallback(() => {
    const canvas = chartRefs.context.current;
    if (!canvas || allFilteredData.length === 0) return;
    destroyChart("context");

    const ctx = canvas.getContext("2d");

    // Group by model name, show how VRAM grows with context length
    const modelGroups = {};
    for (const d of allFilteredData) {
      const name = d.displayName;
      if (!modelGroups[name]) modelGroups[name] = [];
      modelGroups[name].push(d);
    }

    // Only show models with multiple context lengths
    const multiCtx = Object.entries(modelGroups)
      .filter(([, items]) => {
        const ctxSet = new Set(items.map((i) => i.contextLength));
        return ctxSet.size > 1;
      })
      .slice(0, 12); // Cap at 12 lines for readability

    if (multiCtx.length === 0) {
      // Fallback: show all models at their context lengths
      const fallbackModels = Object.entries(modelGroups).slice(0, 10);
      const datasets = fallbackModels.map(([name, items], i) => {
        const sorted = items.sort((a, b) => a.contextLength - b.contextLength);
        const color = PALETTE[i % PALETTE.length];
        return {
          label: name.length > 25 ? name.slice(0, 23) + "…" : name,
          data: sorted.map((d) => ({
            x: d.contextLength / 1024,
            y: d.modelVramGiB,
          })),
          borderColor: color.border,
          backgroundColor: color.bg,
          borderWidth: 2,
          pointRadius: 5,
          pointHoverRadius: 7,
          pointBorderWidth: 1.5,
          pointBorderColor: color.border,
          tension: 0.3,
          fill: false,
        };
      });

      chartInstances.current.context = new Chart(ctx, {
        type: "scatter",
        data: { datasets },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          animation: { duration: 500, easing: "easeOutQuart" },
          scales: {
            x: {
              title: { ...AXIS_TITLE_STYLE, text: "Context Length (K tokens)" },
              grid: GRID_STYLE,
              ticks: TICK_STYLE,
            },
            y: {
              title: { ...AXIS_TITLE_STYLE, text: "VRAM (GiB)" },
              grid: GRID_STYLE,
              ticks: TICK_STYLE,
            },
          },
          plugins: {
            legend: LEGEND_STYLE,
            tooltip: {
              ...TOOLTIP_STYLE,
              callbacks: {
                title: (items) => items[0]?.dataset?.label || "",
                label: (item) => [
                  ` Context: ${item.raw.x}K`,
                  ` VRAM: ${item.raw.y.toFixed(2)} GiB`,
                ],
              },
            },
          },
        },
      });
      return;
    }

    const datasets = multiCtx.map(([name, items], i) => {
      const sorted = items.sort((a, b) => a.contextLength - b.contextLength);
      const color = PALETTE[i % PALETTE.length];
      return {
        label: name.length > 25 ? name.slice(0, 23) + "…" : name,
        data: sorted.map((d) => ({
          x: d.contextLength / 1024,
          y: d.modelVramGiB,
        })),
        borderColor: color.border,
        backgroundColor: color.bg,
        borderWidth: 2,
        pointRadius: 5,
        pointHoverRadius: 7,
        pointBorderWidth: 1.5,
        pointBorderColor: color.border,
        tension: 0.3,
        fill: false,
        showLine: true,
      };
    });

    chartInstances.current.context = new Chart(ctx, {
      type: "scatter",
      data: { datasets },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        animation: { duration: 500, easing: "easeOutQuart" },
        scales: {
          x: {
            title: { ...AXIS_TITLE_STYLE, text: "Context Length (K tokens)" },
            grid: GRID_STYLE,
            ticks: TICK_STYLE,
          },
          y: {
            title: { ...AXIS_TITLE_STYLE, text: "VRAM (GiB)" },
            grid: GRID_STYLE,
            ticks: TICK_STYLE,
          },
        },
        plugins: {
          legend: LEGEND_STYLE,
          tooltip: {
            ...TOOLTIP_STYLE,
            callbacks: {
              title: (items) => items[0]?.dataset?.label || "",
              label: (item) => [
                ` Context: ${item.raw.x}K`,
                ` VRAM: ${item.raw.y.toFixed(2)} GiB`,
              ],
            },
          },
        },
      },
    });
  }, [allFilteredData]);

  // ── Render active chart on data/view change ─────────────

  useEffect(() => {
    if (loading || error) return;

    // Chart.js global defaults
    Chart.defaults.color = "#6b728e";
    Chart.defaults.borderColor = "rgba(255,255,255,0.04)";
    Chart.defaults.font.family = CHART_FONT;

    // Render the active view
    const renderMap = {
      scatter: renderScatter,
      bar: renderBar,
      efficiency: renderEfficiency,
      quantDist: renderQuantDist,
      context: renderContext,
    };
    renderMap[activeView]?.();

    return () => destroyChart(activeView);
  }, [
    loading,
    error,
    activeView,
    renderScatter,
    renderBar,
    renderEfficiency,
    renderQuantDist,
    renderContext,
  ]);

  // ── Subtitle for header ──────────────────────────────────

  const subtitle = useMemo(() => {
    const parts = [
      `${rawData.length} benchmarks`,
      `${machines.length} machine${machines.length !== 1 ? "s" : ""}`,
    ];
    if (hwLabel) parts.push(hwLabel);
    return parts.join(" · ");
  }, [rawData.length, machines.length, hwLabel]);

  // ── Chart descriptions per view ──────────────────────────

  const chartDescriptions = {
    scatter: "Each bubble represents a model — size indicates file weight, position reveals the VRAM/throughput trade-off.",
    bar: "Measured GPU VRAM (solid) vs. estimated (dashed outline) — default load settings.",
    efficiency: "Models ranked by tokens-per-second per GiB of VRAM consumed. Higher is better.",
    quantDist: "Average VRAM and speed grouped by quantization format.",
    context: "How VRAM consumption scales as context window size increases per model.",
  };

  // ── Loading / Error ──────────────────────────────────────

  if (loading) {
    return (
      <>
        <PageHeaderComponent title="VRAM Benchmark" subtitle="Loading…" />
        <div className={styles.content}>
          <LoadingMessage message="Fetching VRAM benchmarks…" />
        </div>
      </>
    );
  }

  if (error) {
    return (
      <>
        <PageHeaderComponent title="VRAM Benchmark" subtitle="Error" />
        <div className={styles.content}>
          <ErrorMessage message={error} />
        </div>
      </>
    );
  }

  // ── Render ───────────────────────────────────────────────

  return (
    <>
      <PageHeaderComponent
        title="VRAM Benchmark"
        subtitle={subtitle}
        centerContent={
          <div className={styles.hwBadge}>
            <Monitor size={12} />
            {hwLabel || "Loading…"}
          </div>
        }
      >
        <button
          className={styles.refreshBtn}
          onClick={() => {
            setLoading(true);
            fetchData();
          }}
        >
          <RefreshCw size={14} />
          Refresh
        </button>
      </PageHeaderComponent>

      <div className={styles.content}>
        {/* Stats cards */}
        {stats && (
          <div className={styles.statsGrid}>
            <StatsCard
              label="Models"
              value={stats.n}
              icon={Cpu}
              variant="accent"
            />
            <StatsCard
              label="Avg VRAM"
              value={`${stats.avgVram} GiB`}
              icon={HardDrive}
              variant="info"
            />
            <StatsCard
              label="Peak TPS"
              value={stats.maxTps}
              subtitle={stats.fastest.displayName.slice(0, 24)}
              icon={Zap}
              variant="success"
            />
            <StatsCard
              label="Avg Efficiency"
              value={`${stats.avgEfficiency}`}
              subtitle="TPS / GiB"
              icon={TrendingUp}
              variant="warning"
            />
            <StatsCard
              label="Avg Est. Error"
              value={`±${stats.avgDelta} GiB`}
              icon={BarChart3}
              variant="danger"
            />
          </div>
        )}

        {/* Filter bar */}
        <FilterBarComponent>
          <FilterSelectComponent
            value={machineFilter}
            onChange={setMachineFilter}
            options={[
              { value: "all", label: "All Machines" },
              ...machines.map((m) => ({
                value: m.hostname,
                label: `${shortGPU(m.gpu)} (${m.benchmarkCount} runs)`,
              })),
            ]}
          />
          <FilterSelectComponent
            value={providerFilter}
            onChange={setProviderFilter}
            options={[
              { value: "all", label: "All Providers" },
              ...providerOptions.map((p) => ({
                value: p,
                label: p,
              })),
            ]}
          />
          <FilterSelectComponent
            value={ctxFilter}
            onChange={setCtxFilter}
            options={[
              { value: "all", label: "All Contexts" },
              ...contextOptions.map((c) => ({
                value: String(c),
                label: `${(c / 1024).toFixed(0)}K Context`,
              })),
            ]}
          />
          <FilterSelectComponent
            value={sortBy}
            onChange={setSortBy}
            options={[
              { value: "vram", label: "Sort: VRAM Usage" },
              { value: "tps", label: "Sort: Tokens/sec" },
              { value: "efficiency", label: "Sort: Efficiency" },
              { value: "filesize", label: "Sort: File Size" },
            ]}
          />
        </FilterBarComponent>

        {/* Tab bar for chart type */}
        <TabBarComponent
          tabs={VIEW_TABS}
          activeTab={activeView}
          onChange={setActiveView}
          className={styles.tabBar}
        />

        {/* Chart area */}
        <div className={styles.chartCard}>
          <p className={styles.chartDescription}>
            {chartDescriptions[activeView]}
          </p>
          <div className={styles.chartPanels}>
            {VIEW_TABS.map((tab) => (
              <div
                key={tab.key}
                className={styles.chartWrapper}
                style={{
                  display: activeView === tab.key ? "block" : "none",
                  height: tab.key === "bar" || tab.key === "efficiency"
                    ? undefined
                    : 460,
                }}
              >
                <canvas ref={chartRefs[tab.key]} />
              </div>
            ))}
          </div>
        </div>
      </div>
    </>
  );
}
