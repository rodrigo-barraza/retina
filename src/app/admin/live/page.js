"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import {
  Activity,
  Clock,
  MessageSquare,
  User,
  AlertCircle,
  RefreshCw,
  ChevronDown,
  ChevronUp,
  Loader,
} from "lucide-react";
import { IrisService } from "../../../services/IrisService";
import { PrismService } from "../../../services/PrismService";
import MessageList from "../../../components/MessageList";
import SettingsPanel from "../../../components/SettingsPanel";
import StatsCard from "../../../components/StatsCard";
import styles from "./page.module.css";

const REFRESH_INTERVAL = 2000; // 2s

function timeAgo(dateStr) {
  if (!dateStr) return "-";
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  return `${Math.floor(hours / 24)}d ago`;
}

function getActivityLevel(dateStr) {
  if (!dateStr) return "idle";
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 2) return "active";
  if (mins < 5) return "recent";
  return "idle";
}


export default function LivePage() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [lastRefresh, setLastRefresh] = useState(null);
  const [expandedId, setExpandedId] = useState(null);
  const [fullConversations, setFullConversations] = useState({});
  const [loadingConv, setLoadingConv] = useState(null);
  const [config, setConfig] = useState(null);
  const intervalRef = useRef(null);

  useEffect(() => {
    PrismService.getConfig().then(setConfig).catch(() => {});
  }, []);

  async function loadLive() {
    try {
      setError(null);
      const result = await IrisService.getLiveActivity(5);
      setData(result);
      setLastRefresh(new Date());
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  const toggleExpand = useCallback(async (convId) => {
    if (expandedId === convId) {
      setExpandedId(null);
      return;
    }
    setExpandedId(convId);
    try {
      setLoadingConv(convId);
      const full = await IrisService.getConversation(convId);
      setFullConversations((prev) => ({ ...prev, [convId]: full }));
    } catch (err) {
      console.error("Failed to load conversation:", err);
    } finally {
      setLoadingConv(null);
    }
  }, [expandedId]);

  // Re-fetch expanded conversation on each list refresh, but only update
  // state if message count changed to avoid scroll-resetting re-renders
  useEffect(() => {
    if (!expandedId || !lastRefresh) return;
    let cancelled = false;
    (async () => {
      try {
        const full = await IrisService.getConversation(expandedId);
        if (!cancelled) {
          setFullConversations((prev) => {
            const existing = prev[expandedId];
            const oldCount = existing?.messages?.length || 0;
            const newCount = full?.messages?.length || 0;
            if (newCount !== oldCount) {
              return { ...prev, [expandedId]: full };
            }
            return prev;
          });
        }
      } catch (err) {
        console.error("Failed to refresh expanded conversation:", err);
      }
    })();
    return () => { cancelled = true; };
  }, [expandedId, lastRefresh]);

  useEffect(() => {
    loadLive();
    intervalRef.current = setInterval(loadLive, REFRESH_INTERVAL);
    return () => clearInterval(intervalRef.current);
  }, []);

  const conversations = data?.conversations || [];
  const activeCount = data?.activeCount || 0;

  // Separate active vs recent
  const activeConvs = conversations.filter(
    (c) => getActivityLevel(c.lastActivity) === "active",
  );
  const recentConvs = conversations.filter(
    (c) => getActivityLevel(c.lastActivity) !== "active",
  );

  // Unique projects
  const uniqueProjects = new Set(conversations.map((c) => c.project));

  return (
    <div className={styles.page}>
      <div className={styles.pageHeader}>
        <div className={styles.titleRow}>
          <h1 className={styles.pageTitle}>Live Activity</h1>
          <span className={styles.liveDot}>
            <span className={styles.liveDotInner} />
            Live
          </span>
        </div>
        <div className={styles.refreshInfo}>
          <RefreshCw size={12} />
          {lastRefresh
            ? `Updated ${lastRefresh.toLocaleTimeString()}`
            : "Loading..."}
        </div>
      </div>

      {error && (
        <div className={styles.errorBanner}>
          <AlertCircle size={18} />
          {error}
        </div>
      )}

      {/* Stats */}
      <div className={styles.statsRow}>
        <StatsCard
          label="Active Conversations"
          value={loading ? "..." : activeCount}
          subtitle="Updated in last 5 minutes"
          icon={Activity}
          variant="success"
          loading={loading}
        />
        <StatsCard
          label="Active Now"
          value={loading ? "..." : activeConvs.length}
          subtitle="Updated in last 2 minutes"
          icon={MessageSquare}
          variant="accent"
          loading={loading}
        />
        <StatsCard
          label="Active Projects"
          value={loading ? "..." : uniqueProjects.size}
          subtitle="With recent activity"
          icon={User}
          variant="info"
          loading={loading}
        />
      </div>

      {/* Conversations list */}
      {conversations.length === 0 && !loading ? (
        <div className={styles.emptyState}>
          <Activity size={48} className={styles.emptyIcon} />
          <div className={styles.emptyTitle}>No active conversations</div>
          <div className={styles.emptySubtitle}>
            Conversations will appear here when users interact with Prism
          </div>
        </div>
      ) : (
        <div className={styles.convStack}>
          {[...activeConvs, ...recentConvs].map((conv) => {
            const level = getActivityLevel(conv.lastActivity);
            const isExpanded = expandedId === conv.id;
            const fullConv = fullConversations[conv.id];
            const isLoadingThis = loadingConv === conv.id;
            return (
              <div
                key={conv.id}
                className={`${styles.convCard} ${level === "active" ? styles.recentActivity : ""} ${isExpanded ? styles.convCardExpanded : ""}`}
              >
                <div
                  className={styles.convCardHeader}
                  onClick={() => toggleExpand(conv.id)}
                >
                  <span className={styles.convTitle}>
                    {conv.title || "Untitled"}
                  </span>
                  <div className={styles.headerRight}>
                    <div className={styles.convMeta}>
                      <span className={styles.projectBadge}>{conv.project}</span>
                      <span className={styles.metaItem}>
                        <MessageSquare className={styles.metaIcon} />
                        {conv.messageCount || 0} msgs
                      </span>
                      <span className={styles.metaItem}>
                        <Clock className={styles.metaIcon} />
                        {timeAgo(conv.lastActivity)}
                      </span>
                    </div>
                    <span
                      className={`${styles.activityBadge} ${
                        level === "active"
                          ? styles.badgeActive
                          : level === "recent"
                            ? styles.badgeRecent
                            : styles.badgeIdle
                      }`}
                    >
                      {level === "active" && (
                        <span className={styles.liveDotInner} />
                      )}
                      {level === "active"
                        ? "Active"
                        : level === "recent"
                          ? "Recent"
                          : "Idle"}
                    </span>
                    {conv.isGenerating && (
                      <span className={styles.generatingBadge}>
                        <Loader size={12} className={styles.spinning} />
                        Generating
                      </span>
                    )}
                    {isExpanded
                      ? <ChevronUp size={16} className={styles.expandIcon} />
                      : <ChevronDown size={16} className={styles.expandIcon} />
                    }
                  </div>
                </div>

                {!isExpanded && conv.lastMessage && (
                  <div className={styles.lastMessage}>
                    <strong>{conv.lastMessageRole || "user"}:</strong>{" "}
                    {typeof conv.lastMessage === "string"
                      ? conv.lastMessage.slice(0, 200)
                      : "..."}
                    {conv.lastMessage?.length > 200 ? "..." : ""}
                  </div>
                )}

                {isExpanded && (
                  <div className={styles.messagesPanel}>
                    {isLoadingThis ? (
                      <div className={styles.loadingMessages}>Loading messages…</div>
                    ) : fullConv?.messages?.length > 0 ? (
                      <div className={styles.expandedContent}>
                        {fullConv.settings && (
                          <div className={styles.settingsSidebar}>
                            <div className={styles.settingsHeader}>Settings</div>
                            <SettingsPanel
                              config={config}
                              settings={fullConv.settings}
                              readOnly
                            />
                          </div>
                        )}
                        <div className={styles.messagesBody}>
                          <MessageList
                            messages={fullConv.messages}
                            readOnly
                          />
                        </div>
                      </div>
                    ) : (
                      <div className={styles.loadingMessages}>No messages in this conversation.</div>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
