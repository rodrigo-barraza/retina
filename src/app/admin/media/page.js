"use client";

import { useState, useEffect, useCallback } from "react";
import { Search, Image as ImageIcon, Music, Film, FileText, ExternalLink } from "lucide-react";
import Link from "next/link";
import { IrisService } from "../../../services/IrisService";
import styles from "./page.module.css";

const TYPE_FILTERS = [
  { key: "all", label: "All", icon: null },
  { key: "image", label: "Images", icon: ImageIcon },
  { key: "audio", label: "Audio", icon: Music },
  { key: "video", label: "Video", icon: Film },
  { key: "document", label: "Documents", icon: FileText },
];

function getMediaType(url) {
  if (!url) return "unknown";
  const lower = url.toLowerCase();
  if (lower.match(/\.(jpg|jpeg|png|gif|webp|svg|bmp)/)) return "image";
  if (lower.match(/\.(mp3|wav|ogg|m4a|flac|aac)/)) return "audio";
  if (lower.match(/\.(mp4|webm|mov|avi|mkv)/)) return "video";
  if (lower.match(/\.(pdf|doc|docx|txt|csv)/)) return "document";
  if (lower.includes("image") || lower.startsWith("data:image")) return "image";
  if (lower.includes("audio") || lower.startsWith("data:audio")) return "audio";
  if (lower.includes("video") || lower.startsWith("data:video")) return "video";
  return "unknown";
}

function extractMediaFromConversation(conv) {
  const media = [];
  const messages = conv.messages || [];

  messages.forEach((msg) => {
    if (msg.images) {
      msg.images.forEach((url) => {
        media.push({
          url,
          type: getMediaType(url),
          source: "conversation",
          sourceId: conv.id,
          sourceTitle: conv.title || "Untitled",
          role: msg.role,
          timestamp: msg.timestamp || conv.updatedAt,
        });
      });
    }
    if (msg.audio) {
      media.push({
        url: msg.audio,
        type: "audio",
        source: "conversation",
        sourceId: conv.id,
        sourceTitle: conv.title || "Untitled",
        role: msg.role,
        timestamp: msg.timestamp || conv.updatedAt,
      });
    }
  });

  return media;
}

export default function MediaPage() {
  const [allMedia, setAllMedia] = useState([]);
  const [loading, setLoading] = useState(true);
  const [typeFilter, setTypeFilter] = useState("all");
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const PAGE_SIZE = 30;

  const loadMedia = useCallback(async () => {
    try {
      setLoading(true);
      // Fetch recent conversations that contain media
      const convData = await IrisService.getConversations({
        page: 1,
        limit: 100,
        sort: "updatedAt",
        order: "desc",
      });
      const conversations = convData.data || [];

      // Load full conversations to extract media
      const mediaItems = [];
      for (const conv of conversations) {
        try {
          const full = await IrisService.getConversation(conv.id);
          const items = extractMediaFromConversation(full);
          mediaItems.push(...items);
        } catch {
          // skip failed loads
        }
      }

      setAllMedia(mediaItems);
    } catch (err) {
      console.error("Failed to load media:", err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadMedia();
  }, [loadMedia]);

  const filtered = allMedia.filter((m) => {
    if (typeFilter !== "all" && m.type !== typeFilter) return false;
    if (search && !m.sourceTitle.toLowerCase().includes(search.toLowerCase()))
      return false;
    return true;
  });

  const totalPages = Math.ceil(filtered.length / PAGE_SIZE);
  const paged = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  const typeCounts = {};
  allMedia.forEach((m) => {
    typeCounts[m.type] = (typeCounts[m.type] || 0) + 1;
  });

  return (
    <div className={styles.page}>
      <div className={styles.pageHeader}>
        <h1 className={styles.pageTitle}>Media</h1>
        <p className={styles.pageSubtitle}>
          {allMedia.length} files across conversations
        </p>
      </div>

      {/* Filters */}
      <div className={styles.filterBar}>
        <div className={styles.typeFilters}>
          {TYPE_FILTERS.map((f) => {
            const Icon = f.icon;
            const count =
              f.key === "all"
                ? allMedia.length
                : typeCounts[f.key] || 0;
            return (
              <button
                key={f.key}
                className={`${styles.typePill} ${typeFilter === f.key ? styles.typePillActive : ""}`}
                onClick={() => {
                  setTypeFilter(f.key);
                  setPage(1);
                }}
              >
                {Icon && <Icon size={12} />}
                {f.label}
                <span className={styles.pillCount}>{count}</span>
              </button>
            );
          })}
        </div>
        <div className={styles.searchBox}>
          <Search size={14} />
          <input
            type="text"
            placeholder="Search by conversation..."
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setPage(1);
            }}
            className={styles.searchInput}
          />
        </div>
      </div>

      {loading && (
        <div className={styles.loading}>Scanning conversations for media...</div>
      )}

      {/* Media Grid */}
      {!loading && (
        <div className={styles.mediaGrid}>
          {paged.map((m, i) => (
            <div key={i} className={styles.mediaCard}>
              <div className={styles.mediaPreview}>
                {m.type === "image" ? (
                  <img
                    src={m.url}
                    alt=""
                    className={styles.mediaImage}
                    loading="lazy"
                  />
                ) : m.type === "audio" ? (
                  <div className={styles.mediaPlaceholder}>
                    <Music size={32} />
                    <span>Audio</span>
                  </div>
                ) : m.type === "video" ? (
                  <div className={styles.mediaPlaceholder}>
                    <Film size={32} />
                    <span>Video</span>
                  </div>
                ) : (
                  <div className={styles.mediaPlaceholder}>
                    <FileText size={32} />
                    <span>Document</span>
                  </div>
                )}
              </div>
              <div className={styles.mediaInfo}>
                <span className={`${styles.mediaType} ${styles[`type_${m.type}`]}`}>
                  {m.type}
                </span>
                <Link
                  href={`/admin/conversations`}
                  className={styles.mediaSource}
                  title={`From: ${m.sourceTitle}`}
                >
                  <ExternalLink size={10} />
                  {m.sourceTitle}
                </Link>
                <span className={styles.mediaRole}>{m.role}</span>
              </div>
            </div>
          ))}
        </div>
      )}

      {!loading && paged.length === 0 && (
        <div className={styles.empty}>No media found</div>
      )}

      {/* Pagination */}
      {totalPages > 1 && (
        <div className={styles.pagination}>
          <span className={styles.pageInfo}>
            {(page - 1) * PAGE_SIZE + 1}–
            {Math.min(page * PAGE_SIZE, filtered.length)} of {filtered.length}
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
