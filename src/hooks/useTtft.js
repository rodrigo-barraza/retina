import { useReducer, useMemo } from "react";

/**
 * TTFT reducer — captures the server-computed TTFT value or falls back
 * to client-side phase-based tracking.
 *
 * States:
 * - `{ live: true, value }` — actively counting during processing (client-side)
 * - `{ live: false, value }` — latched after TTFT is known (server-side or phase transition)
 * - `{ live: false, value: null }` — idle / turn ended
 */
function ttftReducer(prev, { phase, startTime, perfNow, active, serverTtft }) {
  // Turn ended → clear
  if (!active) {
    if (prev.value === null && !prev.live) return prev;
    return { value: null, live: false, prevPhase: null };
  }

  // Server-computed TTFT arrived — use it (authoritative, all providers)
  if (serverTtft != null) {
    // Already latched with the same value — skip
    if (prev.value === serverTtft && !prev.live) return prev;
    return { value: serverTtft, live: false, prevPhase: phase };
  }

  // Active processing → live counting (client-side fallback)
  if (phase === "processing" && startTime) {
    return {
      value: (perfNow - startTime) / 1000,
      live: true,
      prevPhase: "processing",
    };
  }

  // Phase just transitioned away from processing → latch final value
  if (prev.prevPhase === "processing" && phase !== "processing" && prev.live) {
    return {
      value: prev.value,
      live: false,
      prevPhase: phase,
    };
  }

  // Still latched mid-turn — preserve
  if (prev.value !== null && !prev.live) {
    return { ...prev, prevPhase: phase };
  }

  // No data yet
  if (prev.prevPhase !== phase) {
    return { ...prev, prevPhase: phase };
  }
  return prev;
}

const TTFT_INITIAL = { value: null, live: false, prevPhase: null };

/**
 * useTtft — Time To First Token tracking.
 *
 * Two data sources (priority order):
 *
 * 1. **Server-computed TTFT** (`sessionStats.liveServerTtft`): emitted by the
 *    backend's `generation_started` status event when the first token arrives.
 *    This is authoritative and works for ALL providers, including the
 *    OpenAI-compat path that doesn't emit processing phase events.
 *
 * 2. **Client-side phase tracking** (`liveProcessingPhase` / `liveProcessingStartTime`):
 *    fallback for providers that emit real-time processing progress (LM Studio
 *    native path). Counts up during `processing` phase and latches on transition.
 *
 * After the turn completes, the consumer falls back to the static
 * `avgTimeToGeneration` from backend session stats.
 *
 * @param {object|null} sessionStats — the sessionStats prop
 * @param {number} perfNow — current performance.now() snapshot (from useTokenRate ticker)
 * @param {boolean} needsTicker — whether a turn is active (from useTokenRate)
 * @returns {{ liveTtft: number|null, isLiveTtft: boolean }}
 *   - `liveTtft`: the TTFT value in seconds, or null when no live data
 *   - `isLiveTtft`: true when actively counting (processing phase), false when latched
 */
export default function useTtft(sessionStats, perfNow, needsTicker) {
  const phase = sessionStats?.liveProcessingPhase || null;
  const startTime = sessionStats?.liveProcessingStartTime || null;
  const serverTtft = sessionStats?.liveServerTtft ?? null;

  const [state, dispatch] = useReducer(ttftReducer, TTFT_INITIAL);

  // Dispatch on every tick to keep in sync (same pattern as tok/s reducer)
  useMemo(() => {
    dispatch({ phase, startTime, perfNow, active: needsTicker, serverTtft });
  }, [phase, startTime, perfNow, needsTicker, serverTtft]);

  return {
    liveTtft: state.value,
    isLiveTtft: state.live,
  };
}
