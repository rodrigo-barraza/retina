"use client";

import { useState, useEffect, useCallback } from "react";
import {
  AlertCircle,
  MessageSquare,
} from "lucide-react";
import { IrisService } from "../../../services/IrisService";
import { PrismService } from "../../../services/PrismService";
import MessageList from "../../../components/MessageList";
import SettingsPanel from "../../../components/SettingsPanel";
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
  const [config, setConfig] = useState(null);

  useEffect(() => {
    PrismService.getConfig().then(setConfig).catch(() => {});
  }, []);

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
              <div className={styles.viewerContent}>
                {selectedConv.settings && (
                  <div className={styles.settingsSidebar}>
                    <div className={styles.settingsHeader}>Settings</div>
                    <SettingsPanel
                      config={config}
                      settings={selectedConv.settings}
                      readOnly
                    />
                  </div>
                )}
                <div className={styles.viewerBody}>
                  <MessageList
                    messages={selectedConv.messages || []}
                    readOnly
                  />
                </div>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
