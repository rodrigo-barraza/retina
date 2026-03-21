// ============================================================
// Tool Execution API Route — Server-Side Proxy
// ============================================================
// Proxies tool calls to Sun ecosystem APIs server-side to avoid
// CORS issues. The browser calls this route, which then fetches
// the actual Sun API endpoint and returns the result.
// ============================================================

import {
  WEATHER_API_URL,
  EVENT_API_URL,
  PRODUCT_API_URL,
  TREND_API_URL,
  MARKET_API_URL,
} from "../../../../config.js";

// ────────────────────────────────────────────────────────────
// Tool executors — maps tool names to server-side API calls
// ────────────────────────────────────────────────────────────

const TOOL_EXECUTORS = {
  // ── Weather / Environment ──
  get_current_weather: async () =>
    fetchJson(`${WEATHER_API_URL}/weather/current`),

  get_weather_forecast: async (args) => {
    const days = args.days || 7;
    return fetchJson(`${WEATHER_API_URL}/weather/forecast?days=${days}`);
  },

  get_air_quality: async () =>
    fetchJson(`${WEATHER_API_URL}/air-quality`),

  get_earthquakes: async () =>
    fetchJson(`${WEATHER_API_URL}/earthquakes`),

  get_solar_activity: async () =>
    fetchJson(`${WEATHER_API_URL}/solar`),

  get_aurora_forecast: async () =>
    fetchJson(`${WEATHER_API_URL}/aurora`),

  get_twilight: async () =>
    fetchJson(`${WEATHER_API_URL}/twilight`),

  get_tides: async () =>
    fetchJson(`${WEATHER_API_URL}/tides`),

  get_wildfires: async () =>
    fetchJson(`${WEATHER_API_URL}/wildfires`),

  get_iss_position: async () =>
    fetchJson(`${WEATHER_API_URL}/iss`),

  // ── Events ──
  search_events: async (args) => {
    const params = new URLSearchParams();
    if (args.query) params.set("query", args.query);
    if (args.source) params.set("source", args.source);
    if (args.category) params.set("category", args.category);
    if (args.limit) params.set("limit", args.limit);
    if (args.startDate) params.set("startDate", args.startDate);
    if (args.endDate) params.set("endDate", args.endDate);
    const qs = params.toString();
    return fetchJson(`${EVENT_API_URL}/events/search${qs ? `?${qs}` : ""}`);
  },

  get_upcoming_events: async (args) => {
    const params = new URLSearchParams();
    if (args.days) params.set("days", args.days);
    if (args.limit) params.set("limit", args.limit);
    const qs = params.toString();
    return fetchJson(`${EVENT_API_URL}/events/upcoming${qs ? `?${qs}` : ""}`);
  },

  // ── Commodities / Markets ──
  get_commodities_summary: async () =>
    fetchJson(`${MARKET_API_URL}/commodities/summary`),

  get_commodity_by_category: async (args) =>
    fetchJson(`${MARKET_API_URL}/commodities/category/${args.category}`),

  get_commodity_ticker: async (args) =>
    fetchJson(`${MARKET_API_URL}/commodities/ticker/${encodeURIComponent(args.ticker)}`),

  // ── Trends ──
  get_trends: async (args) => {
    if (args.source) {
      return fetchJson(`${TREND_API_URL}/trends/${args.source}`);
    }
    return fetchJson(`${TREND_API_URL}/trends`);
  },

  // ── Products ──
  search_products: async (args) => {
    const params = new URLSearchParams();
    if (args.query) params.set("query", args.query);
    if (args.category) params.set("category", args.category);
    if (args.limit) params.set("limit", args.limit);
    const qs = params.toString();
    return fetchJson(`${PRODUCT_API_URL}/products/search${qs ? `?${qs}` : ""}`);
  },
};

async function fetchJson(url) {
  try {
    const res = await fetch(url);
    if (!res.ok) {
      return { error: `API returned ${res.status}: ${res.statusText}` };
    }
    return await res.json();
  } catch (err) {
    return { error: `Failed to reach API: ${err.message}` };
  }
}

// ────────────────────────────────────────────────────────────
// POST /api/tools — Execute a tool call server-side
// Body: { name: string, args: object }
// or    { calls: [{ name, args }] } for batch execution
// ────────────────────────────────────────────────────────────

export async function POST(request) {
  try {
    const body = await request.json();

    // Batch execution
    if (body.calls && Array.isArray(body.calls)) {
      const results = await Promise.all(
        body.calls.map(async (call) => {
          const executor = TOOL_EXECUTORS[call.name];
          if (!executor) {
            return { name: call.name, result: { error: `Unknown tool: ${call.name}` } };
          }
          const result = await executor(call.args || {});
          return { name: call.name, id: call.id, result };
        }),
      );
      return Response.json({ results });
    }

    // Single execution
    const { name, args = {} } = body;
    const executor = TOOL_EXECUTORS[name];
    if (!executor) {
      return Response.json({ error: `Unknown tool: ${name}` }, { status: 400 });
    }
    const result = await executor(args);
    return Response.json({ result });
  } catch (err) {
    return Response.json({ error: err.message }, { status: 500 });
  }
}
