// ============================================================================
// Whisq Core — Bind sentinel (WHISQ-120)
//
// Dev-mode detection for the "spread then overwrite" footgun:
//
//   input({
//     ...bind(draft),        // returns { value, oninput }
//     oninput: (e) => track(e),   // silently drops bind's oninput
//   });
//
// JS object spread is last-key-wins. By the time the element builder sees
// `props`, bind's oninput is already gone. We can't detect that from the
// final props alone — there's only one handler per key.
//
// Mechanism: bind() / bindField() / bindPath() attach a symbol-keyed
// metadata record to their return objects. Object spread copies symbol-
// keyed own properties (including non-enumerables by design in `{ ... }`
// spread for enumerable symbols), so the record survives into the final
// props. The element builder checks: "for each handler I declared, is
// the current prop handler === what I declared?" If differs → warn.
//
// Caveat (documented): this only catches direction-1 (user overwrites
// after spread). It cannot catch direction-2 (user handler first, then
// spread bind on top) — the user's original handler is gone without a
// trace by the time props reach the element builder. The recommended
// convention is to spread bind/bindField/bindPath LAST; `compose()`
// (WHISQ-132) is the order-independent escape hatch when you deliberately
// want to augment a bind result with extra handlers.
// ============================================================================

/**
 * Well-known symbol carrying the handler map from bind() / bindField() /
 * bindPath() through object spread. Not exported publicly — used only as
 * a dev-mode diagnostic channel between the bind family and the element
 * builder. Symbol.for() so the same token is shared across bundled and
 * source builds (tests, externals) without drift.
 */
export const WHISQ_BIND_SOURCES = Symbol.for("whisq.bindSources");

/**
 * Shape of the metadata the bind family attaches under WHISQ_BIND_SOURCES.
 * Keys are event-handler prop names (oninput, onchange, …); values are the
 * exact handler functions that bind returned. The element builder checks
 * `props[key] === sources[key]` — strict identity — to detect overwrites.
 */
export type BindSources = Readonly<Record<string, unknown>>;

/**
 * Attach the sentinel to a bind result. In production the marker is
 * omitted (the checker in the element builder is also dev-gated, so
 * shipping the symbol would only add dead weight). Mutates and returns
 * `result` so call sites stay concise.
 */
export function tagBindResult<T extends object>(result: T): T {
  if (process.env.NODE_ENV === "production") return result;

  const sources: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(result)) {
    if (key.startsWith("on") && typeof value === "function") {
      sources[key] = value;
    }
  }
  // Silent attach — symbol keys don't appear in Object.entries or
  // JSON.stringify so the sentinel never leaks into user-visible output.
  Object.defineProperty(result, WHISQ_BIND_SOURCES, {
    value: sources,
    enumerable: true, // enumerable so `{ ...result }` copies the sentinel
    writable: false,
    configurable: false,
  });
  return result;
}
