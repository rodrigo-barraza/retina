"use client";

import { useEffect, useRef, useCallback } from "react";

/**
 * PixelTransitionComponent — optimized SVG-filter pixelation transition.
 *
 * True DOM pixelation requires SVG feMorphology (dilate) — CSS has no native
 * "pixelate" filter primitive. The filter chain is:
 *   feImage (1×1 sample tile) → feTile → feComposite (sample source) → feMorphology (dilate)
 *
 * GPU optimizations applied:
 *   1. Each blockSize produces a self-contained inline SVG data-URI filter —
 *      zero live DOM filter elements, zero per-frame DOM mutations.
 *   2. Filter strings are cached in a Map so repeated blockSizes are free.
 *   3. The rAF loop only touches `el.style.filter` when the quantized
 *      blockSize actually changes, skipping redundant frames.
 *   4. `will-change: filter` promotes the element to its own compositor layer
 *      before animation starts, isolating repaints to that layer only.
 *
 * Props:
 *   phase        — 'out' (sharp → pixelated), 'in' (pixelated → sharp), or null
 *   duration     — transition duration in ms (default 3000)
 *   maxBlockSize — max pixel block size at peak pixelation (default 24)
 *   onComplete   — callback fired when the transition finishes
 *   targetRef    — ref to the DOM element to apply the effect to
 */
export default function PixelTransitionComponent({
  phase = null,
  duration = 3000,
  maxBlockSize = 24,
  onComplete,
  targetRef,
}) {
  const rafRef = useRef(null);
  const startTimeRef = useRef(null);
  const lastBlockRef = useRef(0);
  const filterCacheRef = useRef(new Map());

  // Latest props always available inside the rAF closure
  const propsRef = useRef({ phase, duration, maxBlockSize, onComplete, targetRef });
  propsRef.current = { phase, duration, maxBlockSize, onComplete, targetRef };

  /** Ease-out cubic — fast initial ramp, decelerates toward end */
  const easeOut = useCallback(
    (t) => 1 - Math.pow(1 - t, 3),
    [],
  );

  /** Ease-in cubic — slow start, accelerates toward end */
  const easeIn = useCallback(
    (t) => t * t * t,
    [],
  );

  /**
   * Build (or retrieve from cache) a CSS `filter: url(...)` value for a given
   * blockSize. The entire SVG filter is encoded as an inline data URI — no
   * live DOM nodes, no getElementById lookups, no per-frame mutations.
   */
  const getFilterCSS = useCallback((blockSize) => {
    if (blockSize <= 1) return "none";

    const cached = filterCacheRef.current.get(blockSize);
    if (cached) return cached;

    const center = Math.floor(blockSize / 2);
    const radius = Math.ceil((blockSize - 1) / 2);

    // 1×1 pixel sample tile positioned at the block center
    const tileSvg = `<svg xmlns="http://www.w3.org/2000/svg" width="${blockSize}" height="${blockSize}"><rect x="${center}" y="${center}" width="1" height="1" fill="black"/></svg>`;
    const tileHref = `data:image/svg+xml;base64,${btoa(tileSvg)}`;

    // Self-contained inline SVG filter — feImage→feTile→feComposite→feMorphology
    const filterSvg = [
      `<svg xmlns="http://www.w3.org/2000/svg">`,
      `<filter id="p" x="0" y="0" width="100%" height="100%" color-interpolation-filters="sRGB">`,
      `<feImage href="${tileHref}" result="s" x="0" y="0" width="${blockSize}" height="${blockSize}"/>`,
      `<feTile in="s" result="t"/>`,
      `<feComposite in="SourceGraphic" in2="t" operator="in" result="c"/>`,
      `<feMorphology in="c" operator="dilate" radius="${radius}"/>`,
      `</filter>`,
      `</svg>`,
    ].join("");

    const value = `url('data:image/svg+xml,${encodeURIComponent(filterSvg)}#p')`;
    filterCacheRef.current.set(blockSize, value);
    return value;
  }, []);

  /** rAF animation tick — stored in a ref to avoid stale closures */
  const tickRef = useRef(null);
  tickRef.current = (timestamp) => {
    if (!startTimeRef.current) startTimeRef.current = timestamp;

    const p = propsRef.current;
    const elapsed = timestamp - startTimeRef.current;
    const rawProgress = Math.min(elapsed / p.duration, 1);

    let blockSize;
    if (p.phase === "out") {
      // Ease-out: pixelation ramps up fast then decelerates
      const progress = easeOut(rawProgress);
      blockSize = Math.round(1 + (p.maxBlockSize - 1) * progress);
    } else if (p.phase === "in") {
      // Ease-in: depixelation starts slow then accelerates to sharp
      const progress = easeIn(rawProgress);
      blockSize = Math.round(p.maxBlockSize - (p.maxBlockSize - 1) * progress);
    } else {
      return;
    }

    // Only mutate the DOM when the quantized block size actually changes
    if (blockSize !== lastBlockRef.current) {
      lastBlockRef.current = blockSize;
      const el = p.targetRef?.current;
      if (el) {
        el.style.filter = blockSize <= 1 ? "" : getFilterCSS(blockSize);
      }
    }

    if (rawProgress < 1) {
      rafRef.current = requestAnimationFrame(tickRef.current);
    } else {
      // Transition complete
      const el = p.targetRef?.current;
      if (p.phase === "in" && el) {
        el.style.filter = "";
        el.style.willChange = "";

      }
      lastBlockRef.current = 0;
      p.onComplete?.();
    }
  };

  useEffect(() => {
    if (!phase) {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
      const el = targetRef?.current;
      if (el) {
        el.style.filter = "";
        el.style.willChange = "";

      }
      lastBlockRef.current = 0;
      return;
    }

    // Promote to compositor layer before the first frame
    const el = targetRef?.current;
    if (el) {
      el.style.willChange = "filter";

    }

    startTimeRef.current = null;
    lastBlockRef.current = 0;
    rafRef.current = requestAnimationFrame(tickRef.current);

    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phase]);

  // Renderless — effect is applied directly to the target element
  return null;
}
