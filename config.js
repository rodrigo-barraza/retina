// ============================================================
// Retina — Runtime Configuration
// ============================================================
// Imports defaults from secrets.js and overrides with production
// values when served from clankerbox.com.
// ============================================================

import { PRISM_URL as DEFAULT_PRISM_URL, PRISM_WS_URL as DEFAULT_PRISM_WS_URL } from "./secrets.js";

const IS_PRODUCTION =
  typeof window !== "undefined" &&
  window.location.hostname.endsWith("clankerbox.com");

export const PRISM_URL = IS_PRODUCTION
  ? "https://prism.clankerbox.com"
  : DEFAULT_PRISM_URL;

export const PRISM_WS_URL = IS_PRODUCTION
  ? "wss://prism.clankerbox.com"
  : DEFAULT_PRISM_WS_URL;
