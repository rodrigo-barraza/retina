"use client";

import { useState, useEffect, useMemo } from "react";
import { IrisService } from "../../../services/IrisService";
import styles from "./page.module.css";

function formatNumber(n) {
  if (n === null || n === undefined) return "0";
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`;
  return n.toLocaleString();
}

function formatCost(n) {
  if (n === null || n === undefined) return "$0.00";
  return `$${n.toFixed(4)}`;
}

function formatLatency(ms) {
  if (ms === null || ms === undefined) return "0ms";
  if (ms >= 1000) return `${(ms / 1000).toFixed(1)}s`;
  return `${Math.round(ms)}ms`;
}

const PROVIDER_COLORS = [
  "#6366f1", "#a855f7", "#ec4899", "#f59e0b",
  "#10b981", "#3b82f6", "#ef4444", "#06b6d4",
];

export default function ProvidersPage() {
  const [modelStats, setModelStats] = useState([]);
  const [loading, setLoading] = useState(true);
  const [expandedProvider, setExpandedProvider] = useState(null);

  useEffect(() => {
    async function load() {
      try {
        setLoading(true);
        const models = await IrisService.getModelStats();
        setModelStats(models);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  // Aggregate by provider
  const providers = useMemo(() => {
    const map = {};
    modelStats.forEach((m) => {
      if (!map[m.provider]) {
        map[m.provider] = {
          provider: m.provider,
          totalRequests: 0,
          totalCost: 0,
          totalTokens: 0,
          avgLatency: 0,
          models: [],
          _latencySum: 0,
          _latencyCount: 0,
        };
      }
      const p = map[m.provider];
      p.totalRequests += m.totalRequests;
      p.totalCost += m.totalCost;
      p.totalTokens += m.totalTokens;
      p._latencySum += (m.avgLatency || 0) * m.totalRequests;
      p._latencyCount += m.totalRequests;
      p.models.push(m);
    });

    return Object.values(map)
      .map((p) => ({
        ...p,
        avgLatency: p._latencyCount ? p._latencySum / p._latencyCount : 0,
        models: p.models.sort((a, b) => b.totalRequests - a.totalRequests),
      }))
      .sort((a, b) => b.totalRequests - a.totalRequests);
  }, [modelStats]);

  const totalRequests = providers.reduce((s, p) => s + p.totalRequests, 0) || 1;

  return (
    <div className={styles.page}>
      <div className={styles.pageHeader}>
        <h1 className={styles.pageTitle}>Providers</h1>
        <p className={styles.pageSubtitle}>
          {providers.length} providers · {modelStats.length} models
        </p>
      </div>

      {loading && (
        <div className={styles.loading}>Loading provider data...</div>
      )}

      <div className={styles.providerList}>
        {providers.map((p, i) => {
          const color = PROVIDER_COLORS[i % PROVIDER_COLORS.length];
          const share = ((p.totalRequests / totalRequests) * 100).toFixed(1);
          const isExpanded = expandedProvider === p.provider;

          return (
            <div key={p.provider} className={styles.providerCard}>
              <button
                className={styles.providerHeader}
                onClick={() =>
                  setExpandedProvider(isExpanded ? null : p.provider)
                }
              >
                <div className={styles.providerName}>
                  <span
                    className={styles.providerDot}
                    style={{ background: color }}
                  />
                  <span>{p.provider}</span>
                  <span className={styles.modelCount}>
                    {p.models.length} models
                  </span>
                </div>
                <div className={styles.providerStats}>
                  <span className={styles.statItem}>
                    <span className={styles.statValue}>
                      {formatNumber(p.totalRequests)}
                    </span>
                    <span className={styles.statLabel}>requests</span>
                  </span>
                  <span className={styles.statItem}>
                    <span className={styles.statValue}>
                      {formatCost(p.totalCost)}
                    </span>
                    <span className={styles.statLabel}>cost</span>
                  </span>
                  <span className={styles.statItem}>
                    <span className={styles.statValue}>
                      {formatLatency(p.avgLatency)}
                    </span>
                    <span className={styles.statLabel}>avg latency</span>
                  </span>
                  <span className={styles.statItem}>
                    <span className={styles.statValue}>{share}%</span>
                    <span className={styles.statLabel}>share</span>
                  </span>
                </div>
                <div className={styles.shareBar}>
                  <div
                    className={styles.shareBarFill}
                    style={{ width: `${share}%`, background: color }}
                  />
                </div>
              </button>
              {isExpanded && (
                <div className={styles.modelList}>
                  <table className={styles.table}>
                    <thead>
                      <tr>
                        <th>Model</th>
                        <th>Requests</th>
                        <th>Tokens</th>
                        <th>Cost</th>
                        <th>Avg Latency</th>
                      </tr>
                    </thead>
                    <tbody>
                      {p.models.map((m) => (
                        <tr key={m.model}>
                          <td style={{ fontWeight: 500, color: "var(--text-primary)" }}>
                            {m.model}
                          </td>
                          <td>{formatNumber(m.totalRequests)}</td>
                          <td>{formatNumber(m.totalTokens)}</td>
                          <td>{formatCost(m.totalCost)}</td>
                          <td>{formatLatency(m.avgLatency)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
