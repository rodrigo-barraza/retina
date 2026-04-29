"use client";

import { useRef, useEffect, useState } from "react";
import styles from "./CycleButton.module.css";
import SoundService from "@/services/SoundService";

/** Duration of the count-up tween in ms. */
const TWEEN_MS = 500;

/** Infinity transitions take 2× as long. */
const INFINITY_TWEEN_MS = TWEEN_MS * 2;

/** Ease-out cubic — fast start, gentle landing. */
function easeOutCubic(t) {
  return 1 - Math.pow(1 - t, 3);
}

/* -- Glitch / scramble character pools ---------------------- */

const SYMBOLS = "!@#$%^&*†‡§¶∆∇≈≠±×÷√∫∑∏⊗⊕⊘⊙◊♠♣♥♦★☆◈⬡⬢⟁⟐⧫⬟";
const ZALGO_COMBINING = [
  "\u0300", "\u0301", "\u0302", "\u0303", "\u0304", "\u0305", "\u0306",
  "\u0307", "\u0308", "\u0309", "\u030A", "\u030B", "\u030C", "\u030D",
  "\u030E", "\u030F", "\u0310", "\u0311", "\u0312", "\u0313", "\u0314",
  "\u0315", "\u0316", "\u0317", "\u0318", "\u0319", "\u031A", "\u031B",
  "\u031C", "\u031D", "\u031E", "\u031F", "\u0320", "\u0321", "\u0322",
  "\u0323", "\u0324", "\u0325", "\u0326", "\u0327", "\u0328", "\u0329",
  "\u032A", "\u032B", "\u032C", "\u032D", "\u032E", "\u032F", "\u0330",
  "\u0331", "\u0332", "\u0333", "\u0334", "\u0335", "\u0336", "\u0337",
  "\u0338", "\u0339", "\u033A", "\u033B", "\u033C", "\u033D", "\u033E",
  "\u033F", "\u0340", "\u0341", "\u0342", "\u0343", "\u0344", "\u0345",
  "\u0346", "\u0347", "\u0348", "\u0349", "\u034A", "\u034B", "\u034C",
  "\u034D", "\u034E", "\u034F", "\u0350", "\u0351", "\u0352", "\u0353",
  "\u0354", "\u0355", "\u0356", "\u0357", "\u0358", "\u0359", "\u035A",
  "\u035B", "\u035C", "\u035D", "\u035E", "\u035F", "\u0360", "\u0361",
];
const GLITCH_CHARS = "ΣΩΨΞΘΔΛΠΦψξθδλπφ¿¡«»░▒▓█▄▀■□▪▫▬▲▼◆●○◎◇";

/** Generate a short randomised glitch string (1–3 chars + zalgo). */
function glitchText() {
  const pool = SYMBOLS + GLITCH_CHARS;
  const len = 1 + Math.floor(Math.random() * 2); // 1-2 base chars
  let result = "";
  for (let i = 0; i < len; i++) {
    result += pool[Math.floor(Math.random() * pool.length)];
    // Add 1-3 zalgo combining marks
    const marks = 1 + Math.floor(Math.random() * 3);
    for (let j = 0; j < marks; j++) {
      result += ZALGO_COMBINING[Math.floor(Math.random() * ZALGO_COMBINING.length)];
    }
  }
  return result;
}

/**
 * CycleButton — a compact clickable pill that cycles through a set of values.
 * Features a counting animation (number tween) when the value changes,
 * inspired by CostBadgeComponent's rolling numbers.
 *
 * When transitioning to Infinity, the counter rolls up to 999, then enters
 * a glitch/scramble phase with random characters, symbols, and zalgo text
 * before resolving to ∞. The entire transition takes 2× the normal duration.
 *
 * When transitioning from Infinity back to a number, it briefly glitches,
 * then counts from -999 → 0 → target.
 *
 *  value       : current value (number | Infinity)
 *  isActive    : boolean — whether to show the highlighted/active state
 *  onClick     : () => void — called on click to advance to next value
 *  title       : optional tooltip string
 */
export default function CycleButton({
  value,
  isActive = false,
  onClick,
  title,
}) {
  const prevValueRef = useRef(value);
  const rafRef = useRef(null);
  const glitchIntervalRef = useRef(null);
  const [displayNum, setDisplayNum] = useState(() =>
    Number.isFinite(value) ? value : 999,
  );
  const [showInfinity, setShowInfinity] = useState(
    () => !Number.isFinite(value),
  );
  const [tweening, setTweening] = useState(false);
  const [glitching, setGlitching] = useState(false);
  const [glitchLabel, setGlitchLabel] = useState("");

  /** Cleanup helper for glitch interval */
  function clearGlitch() {
    if (glitchIntervalRef.current) {
      clearInterval(glitchIntervalRef.current);
      glitchIntervalRef.current = null;
    }
    setGlitching(false);
    setGlitchLabel("");
  }

  useEffect(() => {
    const from = prevValueRef.current;
    prevValueRef.current = value;

    // Same value — no animation
    if (from === value) return;

    // Cancel any in-flight animation
    if (rafRef.current) cancelAnimationFrame(rafRef.current);
    clearGlitch();

    const isToInfinity = !Number.isFinite(value);
    const isFromInfinity = !Number.isFinite(from);

    // -- Transition TO Infinity --------------------------------
    // Phase 1: count from current → 999 (first half of duration)
    // Phase 2: glitch/scramble phase (second half)
    // Phase 3: resolve to ∞
    if (isToInfinity) {
      const startNum = isFromInfinity ? 0 : from;
      const targetNum = 999;
      const countDuration = INFINITY_TWEEN_MS * 0.5;  // first 50% = counting
      const glitchDuration = INFINITY_TWEEN_MS * 0.5;  // last 50% = chaos

      setShowInfinity(false);
      setTweening(true);

      const start = performance.now();
      function tick(now) {
        const elapsed = now - start;
        const progress = Math.min(elapsed / countDuration, 1);
        const eased = easeOutCubic(progress);
        setDisplayNum(Math.round(startNum + (targetNum - startNum) * eased));

        if (progress < 1) {
          rafRef.current = requestAnimationFrame(tick);
        } else {
          // Phase 2: glitch phase
          setGlitching(true);
          setGlitchLabel(glitchText());

          // Swap glitch text rapidly (~30ms intervals for frantic feel)
          glitchIntervalRef.current = setInterval(() => {
            setGlitchLabel(glitchText());
          }, 30);

          // After glitch duration, resolve to ∞
          setTimeout(() => {
            clearGlitch();
            setShowInfinity(true);
            setTweening(false);
          }, glitchDuration);
        }
      }
      rafRef.current = requestAnimationFrame(tick);

      return () => {
        if (rafRef.current) cancelAnimationFrame(rafRef.current);
        clearGlitch();
        setTweening(false);
      };
    }

    // -- Transition FROM Infinity ------------------------------
    // Phase 1: brief glitch phase (first 30%)
    // Phase 2: count from -999 → 0 → target (remaining 70%)
    if (isFromInfinity) {
      const glitchDuration = INFINITY_TWEEN_MS * 0.25;
      const countDuration = INFINITY_TWEEN_MS * 0.75;

      setShowInfinity(false);
      setTweening(true);
      setGlitching(true);
      setGlitchLabel(glitchText());

      // Rapid glitch text swaps
      glitchIntervalRef.current = setInterval(() => {
        setGlitchLabel(glitchText());
      }, 30);

      // After glitch, start counting from -999 → target
      const glitchTimeout = setTimeout(() => {
        clearGlitch();
        setDisplayNum(-999);

        const start = performance.now();
        function tick(now) {
          const elapsed = now - start;
          const progress = Math.min(elapsed / countDuration, 1);
          const eased = easeOutCubic(progress);
          // -999 → value (e.g. 10), passing through 0
          setDisplayNum(Math.round(-999 + (value - -999) * eased));

          if (progress < 1) {
            rafRef.current = requestAnimationFrame(tick);
          } else {
            setDisplayNum(value);
            setTweening(false);
          }
        }
        rafRef.current = requestAnimationFrame(tick);
      }, glitchDuration);

      return () => {
        clearTimeout(glitchTimeout);
        if (rafRef.current) cancelAnimationFrame(rafRef.current);
        clearGlitch();
        setTweening(false);
      };
    }

    // -- Normal number → number transition
    setShowInfinity(false);
    setTweening(true);
    const start = performance.now();
    const delta = value - from;

    function tick(now) {
      const elapsed = now - start;
      const progress = Math.min(elapsed / TWEEN_MS, 1);
      const eased = easeOutCubic(progress);
      setDisplayNum(Math.round(from + delta * eased));

      if (progress < 1) {
        rafRef.current = requestAnimationFrame(tick);
      } else {
        setDisplayNum(value);
        setTweening(false);
      }
    }
    rafRef.current = requestAnimationFrame(tick);

    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
      setTweening(false);
    };
  }, [value]);

  // Determine the label to render
  let label;
  if (showInfinity) {
    label = "∞";
  } else if (glitching) {
    label = glitchLabel;
  } else {
    label = String(displayNum);
  }

  return (
    <button
      type="button"
      className={`${styles.cycleButton} ${isActive ? styles.cycleButtonActive : ""} ${tweening ? styles.tweening : ""} ${showInfinity ? styles.infinity : ""} ${glitching ? styles.glitching : ""}`}
      onClick={(e) => { SoundService.playClickButton({ event: e }); onClick?.(); }}
      onMouseEnter={(e) => SoundService.playHoverButton({ event: e })}
      title={title}
    >
      {label}
    </button>
  );
}
