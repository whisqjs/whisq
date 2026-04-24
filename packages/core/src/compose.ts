// ============================================================================
// Whisq Core — compose() helper for bind family
//
// bind() / bindField() / bindPath() return prop objects that the caller
// spreads into an element factory. JS object spread is last-key-wins, so a
// user-supplied event handler placed next to the bind spread either silently
// clobbers bind (direction-1, dev-warned) or is itself silently clobbered
// (direction-2, undetectable after the fact).
//
// compose(bindResult, extras) merges both sides explicitly and produces a
// single prop object where any shared handler key chains both handlers —
// bind first, then the user handler. Non-handler keys follow normal spread
// semantics: extras win. The returned object carries a fresh bind-sentinel
// whose "declared" handler is the composed chain, so a later overwrite on
// the compose result still trips the same dev warning.
// ============================================================================

import { tagBindResult } from "./bind-sentinel.js";

type EventHandler = (event: Event) => void;

/**
 * Merge a bind result with extra props, chaining event handlers that appear
 * on both sides. For keys that match both a bind handler and a user handler,
 * the returned handler calls bind's first and the user's second — so by the
 * time the user handler runs, the signal has already been updated.
 *
 * ```ts
 * import { bind, compose, input } from "@whisq/core";
 *
 * const draft = signal("");
 * input({
 *   ...compose(bind(draft), {
 *     oninput: (e) => track(e),           // fires after bind writes draft
 *     onfocus: () => analytics.focus(),   // bind has no onfocus — attaches
 *   }),
 * });
 * ```
 *
 * Unlike the "spread bind last" convention, `compose()` is order-independent:
 * `input({ ...compose(bind(s), { oninput: fn }) })` behaves the same whether
 * the compose spread appears first, last, or in the middle of the props
 * object, because both handlers are already merged inside a single handler
 * function before the element factory sees them.
 *
 * Works for `bind()`, `bindField()`, and `bindPath()` — any helper that
 * returns a bind-sentinel-tagged prop object.
 *
 * Non-handler keys (`value`, `checked`, `placeholder`, `class`, …) follow
 * normal object-spread semantics: the extras' value overwrites bind's if
 * present. In practice you won't overlap on those because bind's non-handler
 * props are the ones bind needs to drive the input — override them at your
 * own risk.
 */
export function compose<T extends object, E extends Record<string, unknown>>(
  bindResult: T,
  extras: E,
): T & E {
  const out: Record<string, unknown> = { ...bindResult } as Record<
    string,
    unknown
  >;

  for (const key of Object.keys(extras)) {
    const extraValue = extras[key];
    const existing = out[key];
    if (
      key.startsWith("on") &&
      typeof existing === "function" &&
      typeof extraValue === "function"
    ) {
      const bindHandler = existing as EventHandler;
      const userHandler = extraValue as EventHandler;
      out[key] = (event: Event): void => {
        bindHandler(event);
        userHandler(event);
      };
    } else {
      out[key] = extraValue;
    }
  }

  // Re-tag so the element-builder sentinel sees the composed handler as the
  // "declared" one. That way `...compose(bind(s), { oninput: fn })` never
  // triggers a false-positive dev warning, but a later overwrite on the
  // compose result ({ ...compose(...), oninput: other }) still trips it.
  return tagBindResult(out) as T & E;
}
