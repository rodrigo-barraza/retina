import { useState, useEffect, useReducer, useMemo } from "react";

/**
 * Staleness threshold: if the most recent backend-emitted
 * generation_progress event arrived more than this many
 * milliseconds ago, the request has likely completed.
 */
const PROGRESS_STALE_MS = 3000;

/**
 * Staleness threshold for frontend chunk-counting fallback
 * (used by non-agentic sessions that lack backend progress events).
 */
const CHUNK_STALE_MS = 2000;

/**
 * Last-value-hold reducer for tok/s display.
 *
 * While generating, shows the current live rate. When generation
 * pauses (tool execution, processing), holds the most recent
 * burst's final rate so the badge doesn't flicker to zero during
 * tool calls. Clears when the turn fully ends.
 */
function tokPerSecReducer(prev, { computed, active }) {
  // Turn ended → clear everything
  if (!active) {
    return { current: null, lastComputed: null };
  }
  // Actively generating → show live rate, track for hold
  if (computed !== null) {
    return { current: computed, lastComputed: computed };
  }
  // Paused mid-turn: hold the last burst's rate
  if (prev.lastComputed !== null) {
    return { current: prev.lastComputed, lastComputed: null };
  }
  // Already paused, no new burst to record — keep showing held value
  return prev;
}

const TOK_PER_SEC_INITIAL = { current: null, lastComputed: null };

/**
 * Sum per-worker tok/s from workerGenerationProgress.
 *
 * Each worker's `tokPerSec` is computed independently by CoordinatorService's
 * `buildProgress()` using burst-scoped chunk counters — these values are
 * accurate per-worker rates.
 *
 * The aggregate shown in the SettingsPanel should be the **additive sum**
 * of all concurrent workers (e.g. 3 × 40 = 120 tok/s), not the average.
 *
 * This replaces the broken SessionGenerationTracker aggregate which has
 * outputTokens=0 during streaming (tokens only set at stream end), causing
 * it to fall back to the last completed request's rate.
 *
 * @param {Object|null} workerGenerationProgress — { [workerId]: { tokPerSec, status, ... } }
 * @returns {{ sum: number, count: number }}
 */
function sumWorkerThroughput(workerGenerationProgress) {
  let sum = 0;
  let count = 0;
  if (!workerGenerationProgress) return { sum: 0, count: 0 };
  for (const wp of Object.values(workerGenerationProgress)) {
    if (wp.tokPerSec != null && wp.tokPerSec > 0) {
      sum += wp.tokPerSec;
      count++;
    }
  }
  return { sum, count };
}

/**
 * useTokenRate — live token throughput and elapsed-time computation
 * derived from a sessionStats object.
 *
 * Three data sources (in priority order):
 *
 *   1. **Worker aggregation** (coordinator sessions): Sum of per-worker
 *      `tokPerSec` values from `workerGenerationProgress`. These are
 *      computed by CoordinatorService's `buildProgress()` using accurate
 *      burst-scoped chunk counters. Plus the orchestrator's own rate if
 *      it's also generating.
 *
 *   2. **Backend-sourced** (`liveGenProgress`): tok/s from Prism's
 *      SessionGenerationTracker. Used for solo agentic sessions without
 *      workers (orchestrator-only), where the tracker has accurate data.
 *
 *   3. **Frontend chunk-counting** (fallback): For non-agentic
 *      sessions (regular conversations) that don't emit
 *      generation_progress events. Computes rates from SSE chunk
 *      inter-arrival timing.
 *
 * @param {object|null} sessionStats — the stats object from SettingsPanel props
 * @returns {{
 *   nowMs: number,
 *   perfNow: number,
 *   isStreaming: boolean,
 *   needsTicker: boolean,
 *   turnActive: boolean,
 *   totalElapsedTime: number,
 *   liveTokensPerSec: number|null,
 *   computedTokPerSec: number|null,
 *   hasActiveWorkers: boolean,
 * }}
 */
export default function useTokenRate(sessionStats) {
  // -- Live ticker -----------------------------------------------
  // Stores current wall-clock and performance timestamps so render
  // stays pure (no Date.now() calls in the render body).
  const [nowMs, setNowMs] = useState(() => Date.now());
  const [perfNow, setPerfNow] = useState(() => performance.now());

  const isStreaming = !!(sessionStats?.liveStreamingStartTime);
  const turnActive = !!(sessionStats?.currentTurnStart);
  const needsTicker = turnActive || isStreaming;

  useEffect(() => {
    if (!needsTicker) return;
    // Immediate tick via microtask to avoid synchronous setState in effect body
    const immediate = setTimeout(() => { setNowMs(Date.now()); setPerfNow(performance.now()); }, 0);
    // 500ms interval for smoother tok/s updates during streaming
    const id = setInterval(() => { setNowMs(Date.now()); setPerfNow(performance.now()); }, 500);
    return () => { clearTimeout(immediate); clearInterval(id); };
  }, [needsTicker]);

  // -- Elapsed time ----------------------------------------------
  const completedTime = sessionStats?.completedElapsedTime || 0;
  const liveExtra = sessionStats?.currentTurnStart
    ? Math.max(0, (nowMs - sessionStats.currentTurnStart) / 1000)
    : 0;
  const totalElapsedTime = completedTime + liveExtra;

  // -- Live tok/s computation ------------------------------------
  let computedTokPerSec = null;
  let hasActiveWorkers = false;

  // Priority 1: Sum per-worker tok/s from workerGenerationProgress.
  // These come from CoordinatorService's buildProgress() which uses
  // burst-scoped chunk counters — accurate and independent per worker.
  const { sum: workerSum, count: activeWorkerCount } =
    sumWorkerThroughput(sessionStats?.workerGenerationProgress);

  if (activeWorkerCount > 0) {
    hasActiveWorkers = true;
    let totalRate = workerSum;

    // Add orchestrator's own rate if it's also generating
    // (the orchestrator streams chunks independently via its own SSE path)
    const coordActive = isStreaming
      && sessionStats?.liveStreamingLastChunkTime
      && (perfNow - sessionStats.liveStreamingLastChunkTime) < CHUNK_STALE_MS;
    if (coordActive) {
      const burstElapsed = (sessionStats.liveStreamingBurstElapsed || 0) / 1000;
      const burstTokens = sessionStats.liveStreamingBurstTokens || 0;
      if (burstElapsed > 0 && burstTokens > 0) {
        totalRate += burstTokens / burstElapsed;
      }
    }

    computedTokPerSec = totalRate;
  } else {
    // Priority 2: Backend-sourced generation_progress from
    // SessionGenerationTracker (for solo orchestrator sessions).
    const genProgress = sessionStats?.liveGenProgress;
    const genProgressFresh = genProgress
      && genProgress.timestamp
      && (perfNow - genProgress.timestamp) < PROGRESS_STALE_MS;

    if (genProgressFresh && genProgress.tokPerSec != null) {
      computedTokPerSec = genProgress.tokPerSec;
      hasActiveWorkers = (genProgress.activeRequests || 0) > 1;
    } else {
      // Priority 3: Frontend chunk-counting fallback for non-agentic
      // sessions (Direct Chat) that don't go through the agentic loop.
      const coordActive = isStreaming
        && sessionStats?.liveStreamingLastChunkTime
        && (perfNow - sessionStats.liveStreamingLastChunkTime) < CHUNK_STALE_MS;
      if (coordActive) {
        const burstElapsed = (sessionStats.liveStreamingBurstElapsed || 0) / 1000;
        const burstTokens = sessionStats.liveStreamingBurstTokens || 0;
        if (burstElapsed > 0 && burstTokens > 0) {
          computedTokPerSec = burstTokens / burstElapsed;
        }
      }
    }
  }

  // -- Last-value-hold reducer ------------------------------------
  const [tokPerSecState, dispatchTokPerSec] = useReducer(
    tokPerSecReducer,
    TOK_PER_SEC_INITIAL,
  );
  const liveTokensPerSec = tokPerSecState.current;

  // Dispatch every tick to keep the reducer in sync
  useMemo(() => {
    dispatchTokPerSec({ computed: computedTokPerSec, active: needsTicker });
  }, [computedTokPerSec, needsTicker]);

  return {
    nowMs,
    perfNow,
    isStreaming,
    needsTicker,
    turnActive,
    totalElapsedTime,
    liveTokensPerSec,
    computedTokPerSec,
    hasActiveWorkers,
  };
}
