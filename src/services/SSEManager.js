/**
 * SSEManager — Singleton multiplexer for Server-Sent Events.
 *
 * Browsers enforce a ~6 connection limit per origin under HTTP/1.1.
 * EventSource connections are persistent and count against this limit.
 * Opening multiple EventSource instances to the same URL quickly exhausts
 * the budget, causing all subsequent fetch() calls to queue as "pending".
 *
 * This manager maintains ONE shared EventSource per unique URL and fans out
 * messages to all registered listeners. When the last listener unsubscribes,
 * the underlying connection is closed.
 */

/** @type {Map<string, { es: EventSource, listeners: Set<Function> }>} */
const pools = new Map();

/**
 * Subscribe to an SSE endpoint. Returns an unsubscribe function.
 *
 * @param {string} url - Full SSE endpoint URL
 * @param {Function} onMessage - (parsedData: object) => void
 * @returns {{ unsubscribe: Function }} — call unsubscribe() to detach
 */
export function subscribe(url, onMessage) {
  let entry = pools.get(url);

  if (!entry) {
    const es = new EventSource(url);

    entry = { es, listeners: new Set() };
    pools.set(url, entry);

    es.onmessage = (event) => {
      let data;
      try {
        data = JSON.parse(event.data);
      } catch {
        return; // ignore parse errors
      }
      // Fan out to all listeners (copy the set to avoid mutation during iteration)
      for (const listener of entry.listeners) {
        try {
          listener(data);
        } catch {
          /* listener errors shouldn't break the pool */
        }
      }
    };

    es.onerror = () => {
      // EventSource auto-reconnects; nothing extra needed here.
    };
  }

  entry.listeners.add(onMessage);

  return {
    unsubscribe() {
      const e = pools.get(url);
      if (!e) return;
      e.listeners.delete(onMessage);
      if (e.listeners.size === 0) {
        e.es.close();
        pools.delete(url);
      }
    },
  };
}

export default { subscribe };
