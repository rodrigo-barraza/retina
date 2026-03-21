// ============================================================
// Sun Service — Tool Schemas & Proxy Execution
// ============================================================
// Defines tool schemas for Sun ecosystem APIs. Execution is
// proxied through the Next.js /api/tools route to avoid CORS.
// ============================================================

// ────────────────────────────────────────────────────────────
// Tool Definitions — JSON Schema format for AI function calling
// ────────────────────────────────────────────────────────────

const TOOL_DEFINITIONS = [
  // ── Weather / Environment (Nimbus) ──
  {
    name: "get_current_weather",
    description:
      "Get current weather conditions including temperature, humidity, wind, UV index, feels-like temperature, and precipitation. Returns real-time weather data.",
    parameters: {
      type: "object",
      properties: {},
      required: [],
    },
  },
  {
    name: "get_weather_forecast",
    description:
      "Get multi-day weather forecast including daily high/low temperatures, precipitation probability, and conditions.",
    parameters: {
      type: "object",
      properties: {
        days: {
          type: "number",
          description: "Number of forecast days (default: 7, max: 14)",
        },
      },
      required: [],
    },
  },
  {
    name: "get_air_quality",
    description:
      "Get current air quality data including AQI, PM2.5, PM10, pollen levels, and pollutant concentrations.",
    parameters: {
      type: "object",
      properties: {},
      required: [],
    },
  },
  {
    name: "get_earthquakes",
    description:
      "Get recent earthquake data including magnitude, location, depth, and time.",
    parameters: {
      type: "object",
      properties: {},
      required: [],
    },
  },
  {
    name: "get_solar_activity",
    description:
      "Get current solar activity data including solar flares, coronal mass ejections, geomagnetic storms, and solar wind.",
    parameters: {
      type: "object",
      properties: {},
      required: [],
    },
  },
  {
    name: "get_aurora_forecast",
    description:
      "Get aurora/northern lights forecast including Kp index and visibility predictions.",
    parameters: {
      type: "object",
      properties: {},
      required: [],
    },
  },
  {
    name: "get_twilight",
    description:
      "Get sunrise, sunset, and twilight times for today.",
    parameters: {
      type: "object",
      properties: {},
      required: [],
    },
  },
  {
    name: "get_tides",
    description:
      "Get tidal predictions including high and low tide times and heights.",
    parameters: {
      type: "object",
      properties: {},
      required: [],
    },
  },
  {
    name: "get_wildfires",
    description:
      "Get active wildfire data including fire locations, size, and containment status.",
    parameters: {
      type: "object",
      properties: {},
      required: [],
    },
  },
  {
    name: "get_iss_position",
    description:
      "Get the current position of the International Space Station and crew information.",
    parameters: {
      type: "object",
      properties: {},
      required: [],
    },
  },

  // ── Events (Beacon) ──
  {
    name: "search_events",
    description:
      "Search for local events including concerts, sports games, festivals, community gatherings, and movie releases. Can filter by source, category, date range, and text search.",
    parameters: {
      type: "object",
      properties: {
        query: {
          type: "string",
          description: "Text search query for event names or descriptions",
        },
        source: {
          type: "string",
          description:
            "Filter by event source (e.g. ticketmaster, stubhub, craigslist, eventbrite, meetup, university, city, movies)",
        },
        category: {
          type: "string",
          description:
            "Filter by event category (e.g. music, sports, arts, family, food, community, film)",
        },
        limit: {
          type: "number",
          description: "Maximum number of events to return (default: 20)",
        },
        startDate: {
          type: "string",
          description: "Filter events starting from this ISO date string",
        },
        endDate: {
          type: "string",
          description: "Filter events up to this ISO date string",
        },
      },
      required: [],
    },
  },
  {
    name: "get_upcoming_events",
    description:
      "Get upcoming events in chronological order. Good for 'what's happening this weekend' type questions.",
    parameters: {
      type: "object",
      properties: {
        days: {
          type: "number",
          description: "Number of days ahead to look (default: 7)",
        },
        limit: {
          type: "number",
          description: "Maximum number of events to return (default: 20)",
        },
      },
      required: [],
    },
  },

  // ── Commodities / Markets ──
  {
    name: "get_commodities_summary",
    description:
      "Get a summary of all commodity futures prices including energy, metals, agriculture, and livestock. Shows current price, daily change, and percentage change.",
    parameters: {
      type: "object",
      properties: {},
      required: [],
    },
  },
  {
    name: "get_commodity_by_category",
    description:
      "Get commodity prices filtered by category.",
    parameters: {
      type: "object",
      properties: {
        category: {
          type: "string",
          description:
            "Commodity category: energy, metals, agriculture, livestock, softs, or grains",
          enum: [
            "energy",
            "metals",
            "agriculture",
            "livestock",
            "softs",
            "grains",
          ],
        },
      },
      required: ["category"],
    },
  },
  {
    name: "get_commodity_ticker",
    description:
      "Get detailed data for a specific commodity ticker symbol including current price, historical data, and changes.",
    parameters: {
      type: "object",
      properties: {
        ticker: {
          type: "string",
          description:
            "The commodity ticker symbol (e.g. CL=F for crude oil, GC=F for gold, SI=F for silver, NG=F for natural gas)",
        },
      },
      required: ["ticker"],
    },
  },

  // ── Trends ──
  {
    name: "get_trends",
    description:
      "Get currently trending topics aggregated from multiple sources including Google Trends, Reddit, Wikipedia, Hacker News, and X (Twitter).",
    parameters: {
      type: "object",
      properties: {
        source: {
          type: "string",
          description:
            "Filter by trend source: google, reddit, wikipedia, hackernews, x, mastodon, news",
        },
      },
      required: [],
    },
  },

  // ── Products ──
  {
    name: "search_products",
    description:
      "Search for products with pricing and deal information. Returns product names, prices, ratings, and availability.",
    parameters: {
      type: "object",
      properties: {
        query: {
          type: "string",
          description: "Product search query",
        },
        category: {
          type: "string",
          description: "Product category filter",
        },
        limit: {
          type: "number",
          description: "Maximum number of products to return (default: 20)",
        },
      },
      required: [],
    },
  },
];

// ────────────────────────────────────────────────────────────
// Public API
// ────────────────────────────────────────────────────────────

export default class SunService {
  /**
   * Get all tool schemas for passing to Prism.
   * @returns {Array} Tool definition objects
   */
  static getToolSchemas() {
    return TOOL_DEFINITIONS;
  }

  /**
   * Execute a single tool call via the server-side proxy.
   * @param {string} name - Tool function name
   * @param {object} args - Arguments for the tool
   * @returns {Promise<object>} Tool execution result
   */
  static async executeTool(name, args = {}) {
    try {
      const res = await fetch("/api/tools", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, args }),
      });
      const data = await res.json();
      return data.result || data;
    } catch (err) {
      return { error: `Tool execution failed: ${err.message}` };
    }
  }

  /**
   * Execute multiple tool calls in parallel via the server-side proxy.
   * @param {Array<{ name: string, args: object, id?: string }>} toolCalls
   * @returns {Promise<Array<{ name: string, id?: string, result: object }>>}
   */
  static async executeToolCalls(toolCalls) {
    try {
      const res = await fetch("/api/tools", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          calls: toolCalls.map((tc) => ({
            name: tc.name,
            args: tc.args || {},
            id: tc.id,
          })),
        }),
      });
      const data = await res.json();
      return data.results || [];
    } catch (err) {
      return toolCalls.map((tc) => ({
        name: tc.name,
        id: tc.id,
        result: { error: `Tool execution failed: ${err.message}` },
      }));
    }
  }
}
