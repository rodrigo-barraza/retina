"use client";

/**
 * Inline SVG logos for AI providers, sized to fit inline with text/dropdowns.
 * Usage: <ProviderLogo provider="openai" size={16} />
 */

const LOGOS = {
  openai: (size) => (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="currentColor"
      style={{ flexShrink: 0 }}
    >
      <path d="M22.282 9.821a5.985 5.985 0 0 0-.516-4.91 6.046 6.046 0 0 0-6.51-2.9A6.065 6.065 0 0 0 4.981 4.18a5.998 5.998 0 0 0-3.998 2.9 6.042 6.042 0 0 0 .743 7.097 5.98 5.98 0 0 0 .51 4.911 6.051 6.051 0 0 0 6.515 2.9A5.985 5.985 0 0 0 13.26 24a6.056 6.056 0 0 0 5.772-4.206 5.99 5.99 0 0 0 3.997-2.9 6.056 6.056 0 0 0-.747-7.073zM13.26 22.43a4.476 4.476 0 0 1-2.876-1.04l.141-.081 4.779-2.758a.795.795 0 0 0 .392-.681v-6.737l2.02 1.168a.071.071 0 0 1 .038.052v5.583a4.504 4.504 0 0 1-4.494 4.494zM3.6 18.304a4.47 4.47 0 0 1-.535-3.014l.142.085 4.783 2.759a.771.771 0 0 0 .78 0l5.843-3.369v2.332a.08.08 0 0 1-.033.062L9.74 19.95a4.5 4.5 0 0 1-6.14-1.646zM2.34 7.896a4.485 4.485 0 0 1 2.366-1.973V11.6a.766.766 0 0 0 .388.676l5.815 3.355-2.02 1.168a.076.076 0 0 1-.071 0l-4.83-2.786A4.504 4.504 0 0 1 2.34 7.872zm16.597 3.855l-5.833-3.387L15.119 7.2a.076.076 0 0 1 .071 0l4.83 2.791a4.494 4.494 0 0 1-.676 8.105v-5.678a.79.79 0 0 0-.407-.667zm2.01-3.023l-.141-.085-4.774-2.782a.776.776 0 0 0-.785 0L9.409 9.23V6.897a.066.066 0 0 1 .028-.061l4.83-2.787a4.5 4.5 0 0 1 6.68 4.66zm-12.64 4.135l-2.02-1.164a.08.08 0 0 1-.038-.057V6.075a4.5 4.5 0 0 1 7.375-3.453l-.142.08L8.704 5.46a.795.795 0 0 0-.393.681zm1.097-2.365l2.602-1.5 2.607 1.5v2.999l-2.597 1.5-2.607-1.5z" />
    </svg>
  ),
  anthropic: (size) => (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="currentColor"
      style={{ flexShrink: 0 }}
    >
      <path d="M13.827 3.52h3.603L24 20.48h-3.603l-6.57-16.96zm-7.258 0h3.767L16.906 20.48h-3.674l-1.508-4.116H5.248l-1.508 4.116H0L6.569 3.52zm1.04 3.878L5.248 13.406h4.722L7.61 7.398z" />
    </svg>
  ),
  google: (size) => (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      style={{ flexShrink: 0 }}
    >
      <path
        d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z"
        fill="#4285F4"
      />
      <path
        d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
        fill="#34A853"
      />
      <path
        d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
        fill="#FBBC05"
      />
      <path
        d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
        fill="#EA4335"
      />
    </svg>
  ),
  "lm-studio": (size) => (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      style={{ flexShrink: 0 }}
    >
      <defs>
        <linearGradient id="lms-grad" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#7C5CFC" />
          <stop offset="100%" stopColor="#5B3CC4" />
        </linearGradient>
      </defs>
      <rect width="24" height="24" rx="5" fill="url(#lms-grad)" />
      {/* Stacked horizontal bars — LM Studio logo mark */}
      <rect x="4.5" y="4"   width="15" height="2.2" rx="1.1" fill="rgba(255,255,255,0.95)" />
      <rect x="6"   y="7.6" width="12" height="2.2" rx="1.1" fill="rgba(255,255,255,0.80)" />
      <rect x="4.5" y="11.2" width="15" height="2.2" rx="1.1" fill="rgba(255,255,255,0.95)" />
      <rect x="6"   y="14.8" width="12" height="2.2" rx="1.1" fill="rgba(255,255,255,0.70)" />
      <rect x="4.5" y="18.4" width="15" height="2.2" rx="1.1" fill="rgba(255,255,255,0.55)" />
    </svg>
  ),
  vllm: (size) => (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      style={{ flexShrink: 0 }}
    >
      {/* vLLM checkmark "v" — orange left stroke, blue right stroke */}
      <path
        d="M3 5 L10 20"
        stroke="#F5A623"
        strokeWidth="4.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M10 20 L21 3"
        stroke="#2E8BEF"
        strokeWidth="4.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  ),
  elevenlabs: (size) => (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="currentColor"
      style={{ flexShrink: 0 }}
    >
      <rect x="8" y="3" width="3" height="18" rx="1.2" />
      <rect x="13" y="3" width="3" height="18" rx="1.2" />
    </svg>
  ),
  inworld: (size) => (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="currentColor"
      style={{ flexShrink: 0 }}
    >
      <circle
        cx="12"
        cy="12"
        r="10"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
      />
      <circle cx="9" cy="10" r="1.5" />
      <circle cx="15" cy="10" r="1.5" />
      <path
        d="M8.5 14.5Q12 18 15.5 14.5"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
      />
    </svg>
  ),
  ollama: (size) => (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="currentColor"
      style={{ flexShrink: 0 }}
    >
      {/* Llama ears */}
      <path d="M8 2 C7 2, 6 3, 6 5 L6 8 C6.5 7.5, 7.5 7.5, 8 8 L8 2Z" />
      <path d="M16 2 C17 2, 18 3, 18 5 L18 8 C17.5 7.5, 16.5 7.5, 16 8 L16 2Z" />
      {/* Llama head */}
      <path d="M6 8 C6 6.5, 7 5.5, 8 6 C9 5, 11 4.5, 12 4.5 C13 4.5, 15 5, 16 6 C17 5.5, 18 6.5, 18 8 C18 9, 18.5 10, 18.5 11 C18.5 13, 17 15, 15.5 16 C14.5 16.7, 13 17.5, 12 17.5 C11 17.5, 9.5 16.7, 8.5 16 C7 15, 5.5 13, 5.5 11 C5.5 10, 6 9, 6 8Z" />
      {/* Eyes */}
      <circle cx="9.5" cy="10" r="1.2" fill="var(--bg-primary, #1a1a2e)" />
      <circle cx="14.5" cy="10" r="1.2" fill="var(--bg-primary, #1a1a2e)" />
      {/* Nose / snout */}
      <ellipse cx="12" cy="13.5" rx="2.5" ry="2" fill="var(--bg-primary, #1a1a2e)" />
      <ellipse cx="12" cy="13.5" rx="1.8" ry="1.3" fill="currentColor" />
      <circle cx="11.2" cy="13.2" r="0.5" fill="var(--bg-primary, #1a1a2e)" />
      <circle cx="12.8" cy="13.2" r="0.5" fill="var(--bg-primary, #1a1a2e)" />
    </svg>
  ),
  "llama-cpp": (size) => (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="currentColor"
      style={{ flexShrink: 0 }}
    >
      {/* Same llama but smaller / monochrome variant */}
      <path d="M8 2 C7 2, 6 3, 6 5 L6 8 C6.5 7.5, 7.5 7.5, 8 8 L8 2Z" />
      <path d="M16 2 C17 2, 18 3, 18 5 L18 8 C17.5 7.5, 16.5 7.5, 16 8 L16 2Z" />
      <path d="M6 8 C6 6.5, 7 5.5, 8 6 C9 5, 11 4.5, 12 4.5 C13 4.5, 15 5, 16 6 C17 5.5, 18 6.5, 18 8 C18 9, 18.5 10, 18.5 11 C18.5 13, 17 15, 15.5 16 C14.5 16.7, 13 17.5, 12 17.5 C11 17.5, 9.5 16.7, 8.5 16 C7 15, 5.5 13, 5.5 11 C5.5 10, 6 9, 6 8Z" />
      <circle cx="9.5" cy="10" r="1.2" fill="var(--bg-primary, #1a1a2e)" />
      <circle cx="14.5" cy="10" r="1.2" fill="var(--bg-primary, #1a1a2e)" />
      <ellipse cx="12" cy="13.5" rx="2.5" ry="2" fill="var(--bg-primary, #1a1a2e)" />
      <ellipse cx="12" cy="13.5" rx="1.8" ry="1.3" fill="currentColor" />
      <circle cx="11.2" cy="13.2" r="0.5" fill="var(--bg-primary, #1a1a2e)" />
      <circle cx="12.8" cy="13.2" r="0.5" fill="var(--bg-primary, #1a1a2e)" />
      {/* C++ badge */}
      <rect x="15" y="15" width="8" height="6" rx="1.5" fill="var(--bg-primary, #1a1a2e)" />
      <text x="19" y="19.5" textAnchor="middle" fontSize="5" fontWeight="bold" fill="currentColor">C++</text>
    </svg>
  ),
};

export default function ProviderLogo({ provider, size = 16, className = "" }) {
  // Resolve multi-instance IDs (e.g. "lm-studio-2") to base type logo
  const key = LOGOS[provider] ? provider : _resolveBaseTypeFromLogos(provider);
  const render = LOGOS[key];
  if (!render) return null;
  return (
    <span
      className={className}
      style={{ display: "inline-flex", alignItems: "center" }}
    >
      {render(size)}
    </span>
  );
}

/**
 * Resolve base type from a potentially numbered instance ID, using LOGOS keys.
 * Inline helper so ProviderLogo works before setLocalProviderMeta is called.
 */
function _resolveBaseTypeFromLogos(id) {
  const match = id.match(/^(.+)-(\d+)$/);
  if (match && LOGOS[match[1]]) return match[1];
  return id;
}

/**
 * Base display labels for provider types.
 */
export const PROVIDER_LABELS = {
  openai: "OpenAI",
  anthropic: "Anthropic",
  google: "Google",
  elevenlabs: "ElevenLabs",
  inworld: "Inworld",
  "lm-studio": "LM Studio",
  vllm: "vLLM",
  ollama: "Ollama",
  "llama-cpp": "llama.cpp",
};

// -- Multi-instance nickname registry ----------------------------
// Populated from the /config response's `localProviders` array.
// Maps instance IDs (e.g. "lm-studio-2") → { nickname, instanceNumber }

/** @type {Map<string, { nickname?: string, instanceNumber: number }>} */
const _localMeta = new Map();

/**
 * Register local provider metadata from the Prism config response.
 * Call once after fetching `/config` to enable nickname + numbering.
 * @param {Array<{ id: string, type: string, instanceNumber: number, nickname?: string }>} providers
 */
export function setLocalProviderMeta(providers) {
  _localMeta.clear();
  if (!providers) return;
  for (const p of providers) {
    _localMeta.set(p.id, {
      nickname: p.nickname || "",
      instanceNumber: p.instanceNumber,
    });
  }
}

/**
 * Resolve the base provider type from a potentially numbered instance ID.
 * e.g. "lm-studio-2" → "lm-studio", "ollama" → "ollama"
 */
function _resolveBaseType(id) {
  if (PROVIDER_LABELS[id]) return id;
  // Check meta first (authoritative)
  const meta = _localMeta.get(id);
  if (meta) {
    // Walk the labels to find which type this belongs to
    for (const type of Object.keys(PROVIDER_LABELS)) {
      if (id === type || id.startsWith(`${type}-`)) return type;
    }
  }
  // Fallback: strip trailing "-N" suffix
  const match = id.match(/^(.+)-(\d+)$/);
  if (match && PROVIDER_LABELS[match[1]]) return match[1];
  return id;
}

/**
 * Resolve a provider ID to a human-readable display label.
 *
 * Resolution order:
 *   1. Nickname from config → "LM Studio (Desktop)"
 *   2. Numbered instance    → "LM Studio #2"
 *   3. Base type label      → "LM Studio"
 *   4. Raw ID fallback      → "lm-studio-2"
 *
 * @param {string} id - Provider instance ID (e.g. "lm-studio", "lm-studio-2")
 * @returns {string} Human-readable label
 */
export function resolveProviderLabel(id) {
  // Direct match (base type or cloud)
  if (PROVIDER_LABELS[id]) {
    const meta = _localMeta.get(id);
    if (meta?.nickname) return `${PROVIDER_LABELS[id]} (${meta.nickname})`;
    return PROVIDER_LABELS[id];
  }

  const baseType = _resolveBaseType(id);
  const baseName = PROVIDER_LABELS[baseType] || id;
  const meta = _localMeta.get(id);

  if (meta?.nickname) return `${baseName} (${meta.nickname})`;
  if (meta?.instanceNumber) return `${baseName} #${meta.instanceNumber}`;

  // Fallback: parse the suffix number
  const match = id.match(/^(.+)-(\d+)$/);
  if (match && PROVIDER_LABELS[match[1]]) {
    return `${PROVIDER_LABELS[match[1]]} #${match[2]}`;
  }

  return baseName;
}

/**
 * Resolve the logo key for a provider ID.
 * Multi-instance IDs (e.g. "lm-studio-2") map to the base type logo.
 * @param {string} id
 * @returns {string} Logo key for the LOGOS map
 */
export function resolveProviderLogoKey(id) {
  if (LOGOS[id]) return id;
  return _resolveBaseType(id);
}
