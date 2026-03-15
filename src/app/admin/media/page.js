"use client";

import { useState, useEffect, useCallback } from "react";
import { Image as ImageIcon, Music, Film, User, Sparkles, ExternalLink } from "lucide-react";
import Link from "next/link";
import { IrisService } from "../../../services/IrisService";
import { PrismService } from "../../../services/PrismService";
import styles from "./page.module.css";

const ORIGIN_FILTERS = [
  { key: "all", label: "All" },
  { key: "user", label: "Uploaded", icon: User },
  { key: "ai", label: "Generated", icon: Sparkles },
];

const TYPE_FILTERS = [
  { key: "all", label: "All" },
  { key: "image", label: "Images", icon: ImageIcon },
  { key: "audio", label: "Audio", icon: Music },
  { key: "video", label: "Video", icon: Film },
];

function resolveUrl(url) {
  if (!url || typeof url !== "string") return null;
  if (url.startsWith("minio://")) return PrismService.getFileUrl(url);
  if (url.startsWith("data:")) return url;
  if (url.startsWith("http")) return url;
  return url;
}

export default function MediaPage() {
  const [media, setMedia] = useState([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [origin, setOrigin] = useState("all");
  const [type, setType] = useState("all");
  const [page, setPage] = useState(1);
  const PAGE_SIZE = 60;

  const loadMedia = useCallback(async () => {
    try {
      setLoading(true);
      const params = { page, limit: PAGE_SIZE };
      if (origin !== "all") params.origin = origin;
      if (type !== "all") params.type = type;

      const result = await IrisService.getMedia(params);
      setMedia(result.data || []);
      setTotal(result.total || 0);
    } catch (err) {
      console.error("Failed to load media:", err);
    } finally {
      setLoading(false);
    }
  }, [page, origin, type]);

  useEffect(() => {
    loadMedia();
  }, [loadMedia]);

  const totalPages = Math.ceil(total / PAGE_SIZE);

  return (
    <div className={styles.page}>
      <div className={styles.pageHeader}>
        <h1 className={styles.pageTitle}>Media</h1>
        <p className={styles.pageSubtitle}>
          {total} files across conversations
        </p>
      </div>

      {/* Filters */}
      <div className={styles.filterBar}>
        <div className={styles.filterGroup}>
          <span className={styles.filterLabel}>Source</span>
          <div className={styles.pills}>
            {ORIGIN_FILTERS.map((f) => {
              const Icon = f.icon;
              return (
                <button
                  key={f.key}
                  className={`${styles.pill} ${origin === f.key ? styles.pillActive : ""}`}
                  onClick={() => { setOrigin(f.key); setPage(1); }}
                >
                  {Icon && <Icon size={12} />}
                  {f.label}
                </button>
              );
            })}
          </div>
        </div>

        <div className={styles.filterGroup}>
          <span className={styles.filterLabel}>Type</span>
          <div className={styles.pills}>
            {TYPE_FILTERS.map((f) => {
              const Icon = f.icon;
              return (
                <button
                  key={f.key}
                  className={`${styles.pill} ${type === f.key ? styles.pillActive : ""}`}
                  onClick={() => { setType(f.key); setPage(1); }}
                >
                  {Icon && <Icon size={12} />}
                  {f.label}
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {loading && (
        <div className={styles.loading}>Loading media...</div>
      )}

      {/* Media Grid */}
      {!loading && (
        <div className={styles.mediaGrid}>
          {media.map((m, i) => {
            const resolvedUrl = resolveUrl(m.url);
            return (
              <div key={`${m.convId}-${i}`} className={styles.mediaCard}>
                <div className={styles.mediaPreview}>
                  {m.mediaType === "image" && resolvedUrl ? (
                    <img
                      src={resolvedUrl}
                      alt={`${m.origin === "ai" ? "Generated" : "Uploaded"} image`}
                      className={styles.mediaImage}
                      loading="lazy"
                    />
                  ) : m.mediaType === "audio" ? (
                    <div className={styles.mediaPlaceholder}>
                      <Music size={32} />
                      <span>Audio</span>
                    </div>
                  ) : m.mediaType === "video" ? (
                    <div className={styles.mediaPlaceholder}>
                      <Film size={32} />
                      <span>Video</span>
                    </div>
                  ) : (
                    <div className={styles.mediaPlaceholder}>
                      <ImageIcon size={32} />
                    </div>
                  )}
                  <span className={`${styles.originBadge} ${m.origin === "ai" ? styles.originAi : styles.originUser}`}>
                    {m.origin === "ai" ? <><Sparkles size={10} /> Generated</> : <><User size={10} /> Uploaded</>}
                  </span>
                </div>
                <div className={styles.mediaInfo}>
                  <Link
                    href={`/admin/conversations`}
                    className={styles.convLink}
                    title={m.convTitle}
                  >
                    <ExternalLink size={10} />
                    <span>{m.convTitle}</span>
                  </Link>
                  <div className={styles.mediaMeta}>
                    {m.model && <span className={styles.modelTag}>{m.model.split("/").pop()}</span>}
                    {m.timestamp && (
                      <span className={styles.time}>
                        {new Date(m.timestamp).toLocaleDateString()}
                      </span>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {!loading && media.length === 0 && (
        <div className={styles.empty}>No media found</div>
      )}

      {/* Pagination */}
      {totalPages > 1 && (
        <div className={styles.pagination}>
          <span className={styles.pageInfo}>
            Page {page} of {totalPages} · {total} total
          </span>
          <div className={styles.pageButtons}>
            <button
              className={styles.pageBtn}
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page <= 1}
            >
              Prev
            </button>
            <button
              className={styles.pageBtn}
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              disabled={page >= totalPages}
            >
              Next
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
