"use client";

import { useState, useEffect, useCallback } from "react";
import {
  AlertCircle,
  MessageSquare,
  FileText,
  FileAudio,
  FileVideo,
  Volume2,
} from "lucide-react";
import { IrisService } from "../../../services/IrisService";
import styles from "./page.module.css";

export default function ConversationsPage() {
  const [conversations, setConversations] = useState([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedId, setSelectedId] = useState(null);
  const [selectedConv, setSelectedConv] = useState(null);
  const [loadingDetail, setLoadingDetail] = useState(false);
  const [filters, setFilters] = useState({ project: "", search: "" });

  const LIMIT = 50;

  const loadConversations = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const params = { page, limit: LIMIT };
      if (filters.project) params.project = filters.project;
      if (filters.search) params.search = filters.search;

      const data = await IrisService.getConversations(params);
      setConversations(data.data || []);
      setTotal(data.total || 0);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [page, filters]);

  useEffect(() => {
    loadConversations();
  }, [loadConversations]);

  async function selectConversation(id) {
    if (id === selectedId) return;
    setSelectedId(id);
    setLoadingDetail(true);
    try {
      const conv = await IrisService.getConversation(id);
      setSelectedConv(conv);
    } catch {
      setSelectedConv(null);
    } finally {
      setLoadingDetail(false);
    }
  }

  function handleFilterChange(key, value) {
    setFilters((prev) => ({ ...prev, [key]: value }));
    setPage(1);
  }

  function getMimeCategory(dataUrl) {
    if (!dataUrl || typeof dataUrl !== "string") return "file";
    const match = dataUrl.match(/^data:([\w-]+)\//);
    if (!match) return "file";
    const type = match[1];
    if (type === "application") return "pdf";
    if (type === "text") return "text";
    return type;
  }

  function renderMediaItem(dataUrl, index) {
    const category = getMimeCategory(dataUrl);

    if (category === "image") {
      return (
        /* eslint-disable-next-line @next/next/no-img-element */
        <img
          key={index}
          src={dataUrl}
          alt="Attached image"
          className={styles.mediaImage}
        />
      );
    }

    if (category === "audio") {
      return (
        <div key={index} className={styles.mediaCard}>
          <FileAudio size={18} className={styles.mediaCardIcon} />
          <audio controls src={dataUrl} preload="metadata" className={styles.audioPlayer} />
        </div>
      );
    }

    if (category === "video") {
      return (
        <div key={index} className={styles.mediaCard}>
          <video controls src={dataUrl} preload="metadata" className={styles.videoPlayer} />
        </div>
      );
    }

    if (category === "pdf") {
      return (
        <div key={index} className={styles.mediaCard}>
          <FileText size={20} className={styles.mediaCardIcon} />
          <span className={styles.mediaCardLabel}>PDF Document</span>
        </div>
      );
    }

    return (
      <div key={index} className={styles.mediaCard}>
        <FileText size={20} className={styles.mediaCardIcon} />
        <span className={styles.mediaCardLabel}>{category.toUpperCase()}</span>
      </div>
    );
  }

  function renderMessageContent(msg) {
    if (typeof msg.content === "string") {
      return msg.content;
    }
    if (Array.isArray(msg.content)) {
      return msg.content.map((part, i) => {
        if (part.type === "text") return part.text;
        if (part.type === "image_url" || part.type === "image") {
          const src = part.image_url?.url || part.url || part.data;
          return (
            <div key={i} className={styles.mediaPreview}>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={src} alt="Attached image" className={styles.mediaImage} />
            </div>
          );
        }
        return null;
      });
    }
    return JSON.stringify(msg.content);
  }

  const totalPages = Math.ceil(total / LIMIT);

  return (
    <div className={styles.page}>
      <div className={styles.pageHeader}>
        <h1 className={styles.pageTitle}>Conversations</h1>
        <p className={styles.pageSubtitle}>
          Browse conversations across all projects
        </p>
      </div>

      {error && (
        <div className={styles.errorBanner}>
          <AlertCircle size={18} />
          {error}
        </div>
      )}

      {/* Filters */}
      <div className={styles.filterBar}>
        <div className={styles.filterGroup}>
          <label className={styles.filterLabel}>Search</label>
          <input
            className={styles.filterInput}
            placeholder="Search by title..."
            value={filters.search}
            onChange={(e) => handleFilterChange("search", e.target.value)}
          />
        </div>
        <div className={styles.filterGroup}>
          <label className={styles.filterLabel}>Project</label>
          <input
            className={styles.filterInput}
            placeholder="Filter by project..."
            value={filters.project}
            onChange={(e) => handleFilterChange("project", e.target.value)}
            style={{ minWidth: 140 }}
          />
        </div>
      </div>

      {/* Split layout */}
      <div className={styles.layout}>
        {/* Conversation List */}
        <div className={styles.listPanel}>
          <div className={styles.listHeader}>
            {total} conversation{total !== 1 ? "s" : ""}
          </div>
          <div className={styles.listBody}>
            {loading && conversations.length === 0 ? (
              <div
                style={{
                  padding: 40,
                  textAlign: "center",
                  color: "var(--text-muted)",
                }}
              >
                Loading...
              </div>
            ) : conversations.length === 0 ? (
              <div
                style={{
                  padding: 40,
                  textAlign: "center",
                  color: "var(--text-muted)",
                }}
              >
                No conversations found
              </div>
            ) : (
              conversations.map((conv) => (
                <div
                  key={conv.id}
                  className={`${styles.convItem} ${selectedId === conv.id ? styles.active : ""}`}
                  onClick={() => selectConversation(conv.id)}
                >
                  <div className={styles.convTitle}>
                    {conv.title || "Untitled"}
                  </div>
                  <div className={styles.convMeta}>
                    <span className={styles.convBadge}>{conv.project}</span>
                    <span>
                      {conv.messageCount || 0} msg
                      {(conv.messageCount || 0) !== 1 ? "s" : ""}
                    </span>
                    <span>
                      {conv.updatedAt
                        ? new Date(conv.updatedAt).toLocaleDateString()
                        : ""}
                    </span>
                  </div>
                </div>
              ))
            )}
          </div>
          {totalPages > 1 && (
            <div className={styles.pagination}>
              <span className={styles.pageInfo}>
                Page {page} of {totalPages}
              </span>
              <div className={styles.pageButtons}>
                <button
                  className={styles.pageBtn}
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  disabled={page === 1}
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

        {/* Conversation Viewer */}
        <div className={styles.viewerPanel}>
          {!selectedConv && !loadingDetail ? (
            <div className={styles.emptyViewer}>
              <div style={{ textAlign: "center" }}>
                <MessageSquare
                  size={40}
                  style={{ opacity: 0.3, marginBottom: 12 }}
                />
                <div>Select a conversation to view</div>
              </div>
            </div>
          ) : loadingDetail ? (
            <div className={styles.emptyViewer}>Loading conversation...</div>
          ) : (
            <>
              <div className={styles.viewerHeader}>
                <div className={styles.viewerTitle}>
                  {selectedConv.title || "Untitled Conversation"}
                </div>
                <div className={styles.viewerMeta}>
                  <span>Project: {selectedConv.project}</span>
                  <span>
                    {selectedConv.messages?.length || 0} messages
                  </span>
                  {selectedConv.settings?.model && (
                    <span>Model: {selectedConv.settings.model}</span>
                  )}
                  {selectedConv.createdAt && (
                    <span>
                      Created:{" "}
                      {new Date(selectedConv.createdAt).toLocaleString()}
                    </span>
                  )}
                </div>
              </div>
              <div className={styles.viewerBody}>
                {selectedConv.systemPrompt && (
                  <div className={styles.message}>
                    <div className={styles.messageHeader}>
                      <span
                        className={`${styles.messageRole} ${styles.roleSystem}`}
                      >
                        System
                      </span>
                    </div>
                    <div className={styles.messageContent}>
                      {selectedConv.systemPrompt}
                    </div>
                  </div>
                )}
                {(selectedConv.messages || []).map((msg, i) => (
                  <div key={i} className={styles.message}>
                    <div className={styles.messageHeader}>
                      <span
                        className={`${styles.messageRole} ${
                          msg.role === "user"
                            ? styles.roleUser
                            : msg.role === "system"
                              ? styles.roleSystem
                              : styles.roleAssistant
                        }`}
                      >
                        {msg.role}
                      </span>
                      {msg.model && (
                        <span className={styles.messageTime}>{msg.model}</span>
                      )}
                      {msg.provider && (
                        <span className={styles.messageTime}>{msg.provider}</span>
                      )}
                    </div>
                    {msg.images && msg.images.length > 0 && (
                      <div className={styles.mediaPreview}>
                        {msg.images.map((dataUrl, j) => renderMediaItem(dataUrl, j))}
                      </div>
                    )}
                    {msg.audio && (
                      <div className={styles.ttsAudio}>
                        <Volume2 size={16} className={styles.mediaCardIcon} />
                        <audio controls src={msg.audio} preload="metadata" className={styles.audioPlayer} />
                      </div>
                    )}
                    {msg.content && (
                      <div
                        className={`${styles.messageContent} ${msg.role === "user" ? styles.user : ""}`}
                      >
                        {renderMessageContent(msg)}
                      </div>
                    )}
                    {msg.usage && msg.role === "assistant" && (
                      <div className={styles.usageMeta}>
                        {msg.usage.inputTokens != null && (
                          <span>{msg.usage.inputTokens} in</span>
                        )}
                        {msg.usage.outputTokens != null && (
                          <span>{msg.usage.outputTokens} out</span>
                        )}
                        {msg.usage.characters != null && (
                          <span>{msg.usage.characters} chars</span>
                        )}
                        {msg.totalTime != null && (
                          <span>{msg.totalTime.toFixed(1)}s</span>
                        )}
                        {msg.estimatedCost != null && (
                          <span>${msg.estimatedCost.toFixed(5)}</span>
                        )}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
