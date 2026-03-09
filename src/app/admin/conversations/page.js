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
import HistoryPanel from "../../../components/HistoryPanel";
import styles from "./page.module.css";

export default function ConversationsPage() {
  const [conversations, setConversations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedId, setSelectedId] = useState(null);
  const [selectedConv, setSelectedConv] = useState(null);
  const [loadingDetail, setLoadingDetail] = useState(false);
  const [config, setConfig] = useState(null);

  useEffect(() => {
    PrismService.getConfig().then(setConfig).catch(() => {});
  }, []);

  const loadConversations = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await IrisService.getConversations({ page: 1, limit: 200, sort: "updatedAt", order: "desc" });
      const list = data.data || [];
      setConversations(list);
      // Auto-select the most recent conversation on first load
      if (list.length > 0 && !selectedId) {
        selectConversation(list[0].id);
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, []);

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

  const convTitle = selectedConv
    ? (selectedConv.title || "Untitled Conversation")
    : "Select a conversation";

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

      {/* Chat-like 3-panel layout */}
      <div className={styles.chatContainer}>
        {/* Settings Sidebar */}
        <aside className={styles.settingsSidebar}>
          <div className={styles.glassHeader}>Settings</div>
          {selectedConv?.settings ? (
            <SettingsPanel
              config={config}
              settings={selectedConv.settings}
              readOnly
            />
          ) : (
            <div className={styles.emptyPanel}>
              Select a conversation to view settings
            </div>
          )}
        </aside>

        {/* Main Chat / Viewer */}
        <section className={styles.mainViewer}>
          <div className={styles.glassHeader}>
            <span className={styles.headerTitle}>{convTitle}</span>
            {selectedConv && (
              <div className={styles.headerMeta}>
                <span className={styles.metaBadge}>{selectedConv.project}</span>
                <span>{selectedConv.messages?.length || 0} messages</span>
                {selectedConv.settings?.model && (
                  <span>{selectedConv.settings.model}</span>
                )}
              </div>
            )}
          </div>
          <div className={styles.viewerBody}>
            {!selectedConv && !loadingDetail ? (
              <div className={styles.emptyViewer}>
                <MessageSquare
                  size={40}
                  style={{ opacity: 0.3, marginBottom: 12 }}
                />
                <div>Select a conversation to view</div>
              </div>
            ) : loadingDetail ? (
              <div className={styles.emptyViewer}>Loading conversation...</div>
            ) : (
              <MessageList
                messages={selectedConv.messages || []}
                readOnly
              />
            )}
          </div>
        </section>

        {/* History Sidebar */}
        <aside className={styles.historySidebar}>
          <div className={styles.glassHeader}>History</div>
          <HistoryPanel
            conversations={conversations}
            activeId={selectedId}
            onSelect={(conv) => selectConversation(conv.id)}
            readOnly
            showProject
          />
        </aside>
      </div>
    </div>
  );
}
