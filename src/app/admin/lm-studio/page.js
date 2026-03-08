"use client";

import { useState, useEffect, useCallback } from "react";
import {
  Server,
  HardDrive,
  Loader2,
  Power,
  PowerOff,
  RefreshCw,
  AlertCircle,
  CheckCircle,
  Cpu,
  Eye,
} from "lucide-react";
import { IrisService } from "../../../services/IrisService";
import styles from "./page.module.css";

function formatBytes(bytes) {
  if (!bytes) return "—";
  if (bytes >= 1_073_741_824) return `${(bytes / 1_073_741_824).toFixed(1)} GB`;
  if (bytes >= 1_048_576) return `${(bytes / 1_048_576).toFixed(1)} MB`;
  return `${(bytes / 1024).toFixed(0)} KB`;
}

export default function LmStudioPage() {
  const [models, setModels] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [actionInProgress, setActionInProgress] = useState(null); // { id, type: 'load'|'unload' }
  const [toast, setToast] = useState(null);

  const fetchModels = useCallback(async () => {
    try {
      setError(null);
      const data = await IrisService.getLmStudioModels();
      setModels(data.models || []);
    } catch (err) {
      setError(err.message);
      setModels([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchModels();
    const interval = setInterval(fetchModels, 15000);
    return () => clearInterval(interval);
  }, [fetchModels]);

  const showToast = (message, type = "success") => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 4000);
  };

  const handleLoad = async (modelKey) => {
    setActionInProgress({ id: modelKey, type: "load" });
    try {
      await IrisService.loadLmStudioModel(modelKey);
      showToast(`Loaded ${modelKey}`, "success");
      await fetchModels();
    } catch (err) {
      showToast(`Failed to load: ${err.message}`, "error");
    } finally {
      setActionInProgress(null);
    }
  };

  const handleUnload = async (instanceId) => {
    setActionInProgress({ id: instanceId, type: "unload" });
    try {
      await IrisService.unloadLmStudioModel(instanceId);
      showToast(`Unloaded ${instanceId}`, "success");
      await fetchModels();
    } catch (err) {
      showToast(`Failed to unload: ${err.message}`, "error");
    } finally {
      setActionInProgress(null);
    }
  };

  const handleRefresh = async () => {
    setLoading(true);
    await fetchModels();
  };

  const loadedCount = models.filter((m) => m.loaded_instances?.length > 0).length;

  return (
    <div className={styles.page}>
      <div className={styles.pageHeader}>
        <div className={styles.titleRow}>
          <h1 className={styles.pageTitle}>
            <Server size={24} /> LM Studio
          </h1>
          <button className={styles.refreshBtn} onClick={handleRefresh} disabled={loading}>
            <RefreshCw size={16} className={loading ? styles.spinning : ""} />
            Refresh
          </button>
        </div>
        <p className={styles.pageSubtitle}>
          Manage local models — {loadedCount} loaded, {models.length} available
        </p>
      </div>

      {error && (
        <div className={styles.errorBanner}>
          <AlertCircle size={18} />
          <span>{error}</span>
          <span className={styles.errorHint}>
            Make sure LM Studio is running on localhost:1234
          </span>
        </div>
      )}

      {toast && (
        <div className={`${styles.toast} ${styles[toast.type]}`}>
          {toast.type === "success" ? <CheckCircle size={16} /> : <AlertCircle size={16} />}
          {toast.message}
        </div>
      )}

      <div className={styles.modelGrid}>
        {loading && models.length === 0 ? (
          <div className={styles.loadingState}>
            <Loader2 size={24} className={styles.spinning} />
            <span>Connecting to LM Studio...</span>
          </div>
        ) : models.length === 0 && !error ? (
          <div className={styles.emptyState}>
            <Server size={32} />
            <p>No models found in LM Studio</p>
          </div>
        ) : (
          models
            .filter((m) => m.type === "llm")
            .map((model) => {
              const isLoaded = model.loaded_instances?.length > 0;
              const instance = model.loaded_instances?.[0];
              const isActioning = actionInProgress && (actionInProgress.id === model.key || actionInProgress.id === instance?.id);
              const actionType = isActioning ? actionInProgress.type : null;

              return (
                <div key={model.key} className={`${styles.modelCard} ${isLoaded ? styles.loaded : ""}`}>
                  <div className={styles.modelHeader}>
                    <div className={styles.modelStatus}>
                      <span className={`${styles.statusDot} ${isLoaded ? styles.active : ""}`} />
                      <span className={styles.statusLabel}>
                        {actionType === "load" ? "Loading…" : actionType === "unload" ? "Unloading…" : isLoaded ? "Loaded" : "Available"}
                      </span>
                    </div>
                    {isActioning ? (
                      <button className={`${styles.actionBtn} ${actionType === "unload" ? styles.unloadBtn : styles.loadingBtn}`} disabled>
                        <Loader2 size={14} className={styles.spinning} />
                        {actionType === "load" ? "Loading model…" : "Unloading…"}
                      </button>
                    ) : isLoaded ? (
                      <button
                        className={`${styles.actionBtn} ${styles.unloadBtn}`}
                        onClick={() => handleUnload(instance.id)}
                        title="Unload model"
                        disabled={!!actionInProgress}
                      >
                        <PowerOff size={14} />
                        Unload
                      </button>
                    ) : (
                      <button
                        className={`${styles.actionBtn} ${styles.loadBtn}`}
                        onClick={() => handleLoad(model.key)}
                        title="Load model"
                        disabled={!!actionInProgress}
                      >
                        <Power size={14} />
                        Load
                      </button>
                    )}
                  </div>

                  <h3 className={styles.modelName}>{model.display_name || model.key}</h3>
                  <p className={styles.modelKey}>{model.key}</p>

                  <div className={styles.modelMeta}>
                    <div className={styles.metaItem}>
                      <HardDrive size={13} />
                      <span>{formatBytes(model.size_bytes)}</span>
                    </div>
                    {model.params_string && (
                      <div className={styles.metaItem}>
                        <Cpu size={13} />
                        <span>{model.params_string}</span>
                      </div>
                    )}
                    {model.architecture && (
                      <div className={styles.metaItem}>
                        <Server size={13} />
                        <span>{model.architecture}</span>
                      </div>
                    )}
                    {model.capabilities?.vision && (
                      <div className={`${styles.metaItem} ${styles.visionBadge}`}>
                        <Eye size={13} />
                        <span>Vision</span>
                      </div>
                    )}
                    {model.quantization?.name && (
                      <div className={styles.metaItem}>
                        <span className={styles.quantBadge}>{model.quantization.name}</span>
                      </div>
                    )}
                  </div>

                  {isLoaded && instance?.config && (
                    <div className={styles.instanceInfo}>
                      <span>ctx: {instance.config.context_length?.toLocaleString()}</span>
                      {instance.config.flash_attention && <span>⚡ Flash Attn</span>}
                      {instance.config.offload_kv_cache_to_gpu && <span>🔥 GPU KV</span>}
                    </div>
                  )}
                </div>
              );
            })
        )}
      </div>
    </div>
  );
}
