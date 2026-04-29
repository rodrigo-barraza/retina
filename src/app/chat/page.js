"use client";

import { useState, useEffect, useCallback, useMemo, Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import AgentComponent from "../../components/AgentComponent";
import PrismService from "../../services/PrismService";
import styles from "./page.module.css";

const LS_ACTIVE_AGENT = "retina:activeAgent";

/** Synthetic "No Agent" entry — direct model chat with all tools. */
const NONE_AGENT = {
  id: "NONE",
  name: "No Agent",
  description: "Direct model conversation with all tools available.",
  project: "direct",
  toolCount: -1, // sentinel — rendered as "All tools" in picker
  custom: false,
  icon: "",
  color: "",
};

export default function AgentsPage() {
  return (
    <Suspense>
      <AgentsPageInner />
    </Suspense>
  );
}

/**
 * Helper to build a URLSearchParams from the current params,
 * apply a set of updates, and return the URL string.
 * Keys with null/undefined values are removed.
 */
function buildUrl(currentParams, updates) {
  const params = new URLSearchParams(currentParams.toString());
  for (const [key, value] of Object.entries(updates)) {
    if (value == null || value === "") {
      params.delete(key);
    } else {
      params.set(key, value);
    }
  }
  const qs = params.toString();
  return qs ? `/chat?${qs}` : "/chat";
}

function AgentsPageInner() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const [agents, setAgents] = useState([]);
  // Always initialize to "CODING" for SSR/client parity — hydrate from
  // localStorage after mount to avoid hydration mismatch.
  const [localAgentId, setLocalAgentId] = useState("CODING");

  useEffect(() => {
    const stored = localStorage.getItem(LS_ACTIVE_AGENT);
    if (stored && stored !== "CODING") {
      setLocalAgentId(stored);
    }
  }, []);

  // Derive active agent: URL param takes priority over localStorage
  const activeAgentId = useMemo(() => {
    const fromUrl = searchParams.get("agent");
    return fromUrl || localAgentId;
  }, [searchParams, localAgentId]);

  const forceFc = searchParams.get("fc") === "true";
  const forceThinking = searchParams.get("thinking") === "true";

  // ── Deep-link params: model + conversation ──────────────────
  const initialModel = searchParams.get("model") || null;
  const initialConversationId = searchParams.get("conversation") || null;

  // Fetch agent personas on mount — prepend "No Agent" synthetic entry
  useEffect(() => {
    PrismService.getAgentPersonas()
      .then((list) => setAgents([NONE_AGENT, ...list]))
      .catch(console.error);
  }, []);

  // ── Strip stale URL params on mount when conversation is present ──
  // If the URL arrives with ?conversation=...&model=...&agent=..., remove
  // model and agent immediately — the conversation data owns those values.
  useEffect(() => {
    const conv = searchParams.get("conversation");
    if (!conv) return;
    const hasModel = searchParams.has("model");
    const hasAgent = searchParams.has("agent");
    if (hasModel || hasAgent) {
      router.replace(
        buildUrl(searchParams, { model: null, agent: null }),
        { scroll: false },
      );
    }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Listen for agent:switch events from AgentComponent
  const handleAgentSwitch = useCallback(
    (e) => {
      const newId = e.detail?.agentId;
      if (newId && newId !== activeAgentId) {
        setLocalAgentId(newId);
        localStorage.setItem(LS_ACTIVE_AGENT, newId);
        router.replace(
          buildUrl(searchParams, { agent: encodeURIComponent(newId) }),
          { scroll: false },
        );
      }
    },
    [activeAgentId, router, searchParams],
  );

  // Listen for model:change events from AgentComponent — sync URL
  const handleModelChange = useCallback(
    (e) => {
      const { provider, model } = e.detail || {};
      if (!provider || !model) return;
      const modelKey = `${provider}:${model}`;
      const current = searchParams.get("model");
      if (current === modelKey) return;
      router.replace(
        buildUrl(searchParams, { model: modelKey }),
        { scroll: false },
      );
    },
    [router, searchParams],
  );

  // Listen for conversation:change events from AgentComponent — sync URL
  // When a conversation is active, strip model & agent from URL — the
  // conversation data is the source of truth for those values.
  const handleConversationChange = useCallback(
    (e) => {
      const { conversationId } = e.detail || {};
      const current = searchParams.get("conversation");
      if (current === (conversationId || null)) return;
      if (conversationId) {
        // Conversation active → keep only conversation param
        router.replace(
          buildUrl(searchParams, { conversation: conversationId, model: null, agent: null }),
          { scroll: false },
        );
      } else {
        // New chat → clear conversation param, keep everything else
        router.replace(
          buildUrl(searchParams, { conversation: null }),
          { scroll: false },
        );
      }
    },
    [router, searchParams],
  );

  useEffect(() => {
    window.addEventListener("agent:switch", handleAgentSwitch);
    window.addEventListener("model:change", handleModelChange);
    window.addEventListener("conversation:change", handleConversationChange);
    return () => {
      window.removeEventListener("agent:switch", handleAgentSwitch);
      window.removeEventListener("model:change", handleModelChange);
      window.removeEventListener("conversation:change", handleConversationChange);
    };
  }, [handleAgentSwitch, handleModelChange, handleConversationChange]);

  // Persist to localStorage on change
  useEffect(() => {
    localStorage.setItem(LS_ACTIVE_AGENT, activeAgentId);
  }, [activeAgentId]);

  return (
    <main className={styles.container}>
      <AgentComponent
        key={activeAgentId}
        agentId={activeAgentId}
        agents={agents}
        initialFcEnabled={forceFc}
        initialThinkingEnabled={forceThinking}
        initialModel={initialModel}
        initialConversationId={initialConversationId}
      />
    </main>
  );
}
