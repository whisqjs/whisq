// ============================================================================
// Whisq Core — Persisted Signals
//
// persistedSignal(key, initial, opts?) returns a Signal<T> backed by
// localStorage / sessionStorage. SSR-safe (returns initial on the server),
// schema-validated on load (throws → fall back to initial), quota-safe on
// write (warns, keeps the in-memory value).
//
// Import path: `@whisq/core/persistence` — kept off the top-level bundle so
// users who don't need it pay no size cost.
// ============================================================================

import { signal, effect, type Signal } from "./reactive.js";

export interface PersistedSignalOptions<T> {
  /** Storage backend. "local" (default) persists across tabs and reloads; "session" only for the tab. */
  storage?: "local" | "session";
  /** Serialize to the stored string. Default: `JSON.stringify`. */
  serialize?: (value: T) => string;
  /** Deserialize from the stored string. Default: `JSON.parse`. */
  deserialize?: (raw: string) => T;
  /**
   * Validate the deserialized value. Return `T` on success; throw to reject
   * and fall back to `initial`. Useful when the stored shape may have changed.
   */
  schema?: (raw: unknown) => T;
}

const getStorage = (which: "local" | "session"): Storage | null => {
  if (typeof window === "undefined") return null;
  try {
    return which === "session" ? window.sessionStorage : window.localStorage;
  } catch {
    // Accessing storage can throw in some privacy modes / cross-origin iframes.
    return null;
  }
};

/**
 * A signal backed by `localStorage` (or `sessionStorage`).
 *
 * ```ts
 * const todos = persistedSignal<Todo[]>("todos", []);
 * effect(() => console.log(todos.value));  // logs after each change
 * todos.value = [...todos.value, newTodo]; // persisted automatically
 * ```
 *
 * ### Behaviors worth leading with
 *
 * - **SSR-safe.** On the server (`typeof window === "undefined"`), returns
 *   a plain signal initialized to `initial` with no storage subscription.
 * - **Schema-validated.** If `schema` throws or the stored JSON is malformed,
 *   the signal falls back to `initial` rather than crashing at mount.
 * - **Quota-safe.** If a write throws (`QuotaExceededError`, private mode),
 *   logs a warning and keeps the in-memory value — the app keeps working.
 * - **Module-scope intent.** The write effect lives for the module lifetime.
 *   Call `persistedSignal` at module scope in your `stores/` file, not inside
 *   components — the effect has no disposal hook by design.
 */
export function persistedSignal<T>(
  key: string,
  initial: T,
  options?: PersistedSignalOptions<T>,
): Signal<T> {
  const serialize = options?.serialize ?? JSON.stringify;
  const deserialize = options?.deserialize ?? JSON.parse;
  const storage = getStorage(options?.storage ?? "local");

  let starting: T = initial;
  if (storage) {
    try {
      const raw = storage.getItem(key);
      if (raw !== null) {
        const parsed = deserialize(raw) as unknown;
        starting = options?.schema
          ? options.schema(parsed)
          : (parsed as T);
      }
    } catch {
      // Parse error, schema rejection, storage-access-error — fall through.
      starting = initial;
    }
  }

  const sig = signal<T>(starting);

  if (storage) {
    // Subscribe to writes. Intentionally un-disposed — persistence effects
    // live for the module lifetime. First call runs synchronously and would
    // overwrite the value we just read with itself, which is a no-op, so
    // harmless.
    let first = true;
    effect(() => {
      const value = sig.value;
      if (first) {
        first = false;
        return;
      }
      try {
        storage.setItem(key, serialize(value));
      } catch (error) {
        // eslint-disable-next-line no-console
        console.warn(
          `persistedSignal: failed to write "${key}" to ${options?.storage ?? "local"}Storage.`,
          error,
        );
      }
    });
  }

  return sig;
}
