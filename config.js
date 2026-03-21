// ============================================================
// Retina — Runtime Configuration
// ============================================================
// Imports defaults from secrets.js and overrides with production
// values when served from clankerbox.com.
// ============================================================

import {
  PORT as SECRETS_PORT,
  PRISM_URL as DEFAULT_PRISM_URL,
  PRISM_WS_URL as DEFAULT_PRISM_WS_URL,
  WEATHER_API_URL as DEFAULT_WEATHER_API_URL,
  EVENT_API_URL as DEFAULT_EVENT_API_URL,
  PRODUCT_API_URL as DEFAULT_PRODUCT_API_URL,
  TREND_API_URL as DEFAULT_TREND_API_URL,
  MARKET_API_URL as DEFAULT_MARKET_API_URL,
} from "./secrets.js";

export const PORT = SECRETS_PORT || 3333;

const IS_PRODUCTION =
  typeof window !== "undefined" &&
  window.location.hostname.endsWith("clankerbox.com");

export const PRISM_URL = IS_PRODUCTION
  ? "https://prism.clankerbox.com"
  : DEFAULT_PRISM_URL;

export const PRISM_WS_URL = IS_PRODUCTION
  ? "wss://prism.clankerbox.com"
  : DEFAULT_PRISM_WS_URL;

// Sun API URLs
export const WEATHER_API_URL = DEFAULT_WEATHER_API_URL;
export const EVENT_API_URL = DEFAULT_EVENT_API_URL;
export const PRODUCT_API_URL = DEFAULT_PRODUCT_API_URL;
export const TREND_API_URL = DEFAULT_TREND_API_URL;
export const MARKET_API_URL = DEFAULT_MARKET_API_URL;
