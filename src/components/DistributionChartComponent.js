"use client";

import { useState, useMemo } from "react";
import {
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Sector,
} from "recharts";
import styles from "./DistributionChartComponent.module.css";
import ChartTabsComponent from "./ChartTabsComponent";

const COLORS = [
  "#6366f1",
  "#a855f7",
  "#ec4899",
  "#f59e0b",
  "#10b981",
  "#3b82f6",
  "#ef4444",
  "#06b6d4",
  "#84cc16",
  "#f97316",
  "#14b8a6",
  "#8b5cf6",
];

const ENDPOINT_LABELS = {
  chat: "Text Generation",
  "chat/image-api": "Image Generation",
  "text-to-audio": "Text-to-Speech",
  "audio-to-text": "Speech-to-Text",
  embed: "Embeddings",
};

function formatEndpoint(endpoint) {
  return ENDPOINT_LABELS[endpoint] || endpoint;
}

/**
 * Builds distribution datasets from model stats, project stats, and overall stats.
 */
function buildDistributions(modelStats, endpointStats, projectStats, stats) {
  // Provider distribution
  const providerMap = {};
  modelStats.forEach((m) => {
    providerMap[m.provider] = (providerMap[m.provider] || 0) + m.totalRequests;
  });

  // Model distribution
  const modelMap = {};
  modelStats.forEach((m) => {
    if (!m.model) return;
    const label = m.model.split("/").pop();
    modelMap[label] = (modelMap[label] || 0) + m.totalRequests;
  });

  // Endpoint / Modality distribution — from dedicated endpoint stats
  const endpointMap = {};
  endpointStats.forEach((e) => {
    if (e.endpoint) {
      const label = formatEndpoint(e.endpoint);
      endpointMap[label] = (endpointMap[label] || 0) + e.totalRequests;
    }
  });

  // Project distribution
  const projectMap = {};
  projectStats.forEach((p) => {
    if (p.project) {
      projectMap[p.project] = (projectMap[p.project] || 0) + p.totalRequests;
    }
  });

  // Status distribution
  const statusMap = {};
  if (stats) {
    if (stats.successCount) statusMap["Success"] = stats.successCount;
    if (stats.errorCount) statusMap["Error"] = stats.errorCount;
  }

  return { providerMap, modelMap, endpointMap, projectMap, statusMap };
}

function toSortedEntries(map) {
  return Object.entries(map)
    .sort((a, b) => b[1] - a[1]);
}

function toPieData(entries) {
  return entries.map(([name, value], i) => ({
    name,
    value,
    fill: COLORS[i % COLORS.length],
  }));
}

/* ── Active sector renderer with glow and center text ── */
function ActiveSectorRenderer(props) {
  const {
    cx, cy, innerRadius, outerRadius,
    startAngle, endAngle, fill, payload, percent,
  } = props;

  return (
    <g>
      <Sector
        cx={cx}
        cy={cy}
        innerRadius={innerRadius - 2}
        outerRadius={outerRadius + 6}
        startAngle={startAngle}
        endAngle={endAngle}
        fill={fill}
        opacity={1}
        style={{ filter: `drop-shadow(0 0 8px ${fill})` }}
      />
      <text
        x={cx}
        y={cy - 8}
        textAnchor="middle"
        fill="#f8f8f8"
        fontSize="12"
        fontWeight="600"
      >
        {payload.name.length > 16
          ? payload.name.slice(0, 14) + "…"
          : payload.name}
      </text>
      <text
        x={cx}
        y={cy + 8}
        textAnchor="middle"
        fill="#8e95ae"
        fontSize="11"
      >
      {payload.value.toLocaleString()} requests
      </text>
      <text
        x={cx}
        y={cy + 22}
        textAnchor="middle"
        fill="#5a6078"
        fontSize="10"
      >
        {(percent * 100).toFixed(1)}%
      </text>
    </g>
  );
}

const STATUS_COLORS = {
  Success: "#10b981",
  Error: "#ef4444",
};

const TABS = [
  { key: "provider", label: "Provider" },
  { key: "model", label: "Model" },
  { key: "modality", label: "Modality" },
  { key: "project", label: "Project" },
  { key: "status", label: "Status" },
];

const TAB_TO_KEY = {
  provider: "providerMap",
  model: "modelMap",
  modality: "endpointMap",
  project: "projectMap",
  status: "statusMap",
};

export default function DistributionChartComponent({
  modelStats = [],
  endpointStats = [],
  projectStats = [],
  stats = null,
  loading = false,
  height = 220,
  title = "Requests",
}) {
  const [activeTab, setActiveTab] = useState("provider");
  const [activeIndex, setActiveIndex] = useState(null);

  const distributions = useMemo(
    () => buildDistributions(modelStats, endpointStats, projectStats, stats),
    [modelStats, endpointStats, projectStats, stats],
  );

  const entries = useMemo(
    () => toSortedEntries(distributions[TAB_TO_KEY[activeTab]] || {}),
    [activeTab, distributions],
  );

  const pieData = useMemo(() => {
    if (activeTab === "status") {
      return entries.map(([name, value]) => ({
        name,
        value,
        fill: STATUS_COLORS[name] || COLORS[0],
      }));
    }
    return toPieData(entries);
  }, [entries, activeTab]);

  const total = entries.reduce((sum, [, v]) => sum + v, 0);

  // Reset active index when switching tabs
  const handleTabChange = (key) => {
    setActiveTab(key);
    setActiveIndex(null);
  };

  return (
    <div className={styles.container}>
      {title && <h2 className={styles.title}>{title}</h2>}
      {/* ── Tab bar ── */}
      <div className={styles.header}>
        <ChartTabsComponent
          tabs={TABS}
          activeTab={activeTab}
          onChange={handleTabChange}
        />
        {total > 0 && (
          <span className={styles.totalBadge}>
            {total.toLocaleString()} total
          </span>
        )}
      </div>

      {/* ── Chart + Legend ── */}
      <div className={styles.body}>
        {pieData.length > 0 ? (
          <>
            <div className={styles.chartArea}>
              <ResponsiveContainer width="100%" height={height}>
                <PieChart>
                  <Pie
                    data={pieData}
                    cx="50%"
                    cy="50%"
                    innerRadius={height * 0.22}
                    outerRadius={height * 0.36}
                    paddingAngle={2}
                    dataKey="value"
                    activeIndex={activeIndex}
                    activeShape={ActiveSectorRenderer}
                    onMouseEnter={(_, index) => setActiveIndex(index)}
                    onMouseLeave={() => setActiveIndex(null)}
                    animationDuration={200}
                    animationEasing="ease-in-out"
                  >
                    {pieData.map((entry, i) => (
                      <Cell
                        key={entry.name}
                        fill={entry.fill}
                        stroke="transparent"
                        opacity={
                          activeIndex === null || activeIndex === i ? 1 : 0.3
                        }
                        style={{ transition: "opacity 0.2s ease" }}
                      />
                    ))}
                  </Pie>
                </PieChart>
              </ResponsiveContainer>
            </div>

            <div className={styles.legend}>
              {entries.map(([name, value], i) => {
                const pct = total > 0 ? ((value / total) * 100).toFixed(1) : 0;
                const color = activeTab === "status"
                  ? (STATUS_COLORS[name] || COLORS[0])
                  : COLORS[i % COLORS.length];

                return (
                  <div
                    key={name}
                    className={`${styles.legendRow} ${activeIndex === i ? styles.legendRowActive : ""}`}
                    onMouseEnter={() => setActiveIndex(i)}
                    onMouseLeave={() => setActiveIndex(null)}
                  >
                    <span
                      className={styles.legendDot}
                      style={{ background: color }}
                    />
                    <span className={styles.legendName} title={name}>
                      {name}
                    </span>
                    <span className={styles.legendValue}>
                      {value.toLocaleString()}
                    </span>
                    <span className={styles.legendPct}>{pct}%</span>
                  </div>
                );
              })}
            </div>
          </>
        ) : (
          <div className={styles.empty}>
            {loading ? "Loading..." : "No data yet"}
          </div>
        )}
      </div>
    </div>
  );
}
