export function formatNumber(n) {
  if (n === null || n === undefined) return "0";
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`;
  return n.toLocaleString();
}

export function formatCost(n) {
  if (n === null || n === undefined) return "$0.00";
  return `$${n.toFixed(5)}`;
}

export function formatLatency(ms) {
  if (ms === null || ms === undefined) return "-";
  if (ms >= 1000) return `${(ms / 1000).toFixed(1)}s`;
  return `${Math.round(ms)}ms`;
}

/**
 * Convert a snake_case function name to a human-readable title.
 * e.g. "get_stock_price" → "Stock Price"
 */
export function renderToolName(name) {
  return name
    .replace(/^get_/, "")
    .replace(/_/g, " ")
    .replace(/\b\w/g, (c) => c.toUpperCase());
}

/**
 * Build ISO date range params from a { from, to } object.
 * Returns an object with optional `from` and `to` keys.
 */
export function buildDateRangeParams(dateRange) {
  const p = {};
  if (dateRange?.from) p.from = new Date(dateRange.from).toISOString();
  if (dateRange?.to)
    p.to = new Date(dateRange.to + "T23:59:59").toISOString();
  return p;
}

/**
 * Format a context window token count (e.g. 128000 → "128K", 1000000 → "1M").
 */
export function formatContextTokens(tokens) {
  if (!tokens) return null;
  if (tokens >= 1_000_000)
    return `${(tokens / 1_000_000).toFixed(tokens % 1_000_000 === 0 ? 0 : 1)}M`;
  return `${Math.round(tokens / 1000)}K`;
}

/**
 * Format a byte count as human-readable file size (GB, MB, KB).
 */
export function formatFileSize(bytes) {
  if (!bytes) return null;
  if (bytes >= 1_073_741_824)
    return `${(bytes / 1_073_741_824).toFixed(1)} GB`;
  if (bytes >= 1_048_576) return `${(bytes / 1_048_576).toFixed(1)} MB`;
  return `${(bytes / 1024).toFixed(0)} KB`;
}

/**
 * Format tokens-per-second with consistent precision.
 * Returns "X.X" or "—" for null/zero values.
 */
export function formatTokensPerSec(value) {
  if (value === null || value === undefined || value === 0) return "—";
  return `${Number(value).toFixed(1)}`;
}

/**
 * Copy text to clipboard with error handling.
 * Returns true on success, false on failure.
 */
export async function copyToClipboard(text) {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    return false;
  }
}
