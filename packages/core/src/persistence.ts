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
  /**
   * Called synchronously **before** falling back to `initial` when the stored
   * payload can't be loaded. Fires on:
   *
   * - `deserialize(raw)` throwing (malformed stored JSON), or
   * - `schema(parsed)` throwing (stored value rejected by the validator).
   *
   * Receives the thrown error and the exact `raw` string read from storage.
   * Use for diagnostics (Sentry, analytics, migration prompts) — the fallback
   * to `initial` still happens regardless of what the callback does.
   *
   * NOT invoked on first visit (no stored value — `raw` would be `null`, not
   * a failure) or on storage-access errors (private mode, disabled storage
   * — those are environment faults, not schema faults). If the callback
   * itself throws, the exception is caught and logged via `console.warn` so
   * a broken diagnostic pipeline can't prevent signal construction.
   */
  onSchemaFailure?: (err: unknown, raw: string) => void;
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
    let raw: string | null = null;
    try {
      raw = storage.getItem(key);
    } catch {
      // Storage-access error (cross-origin iframe, privacy mode, etc.) —
      // leave raw as null. This is an environment fault, not a schema
      // fault, so `onSchemaFailure` does not fire.
    }
    if (raw !== null) {
      try {
        const parsed = deserialize(raw) as unknown;
        starting = options?.schema
          ? options.schema(parsed)
          : (parsed as T);
      } catch (err) {
        starting = initial;
        if (options?.onSchemaFailure) {
          try {
            options.onSchemaFailure(err, raw);
          } catch (callbackError) {
            // eslint-disable-next-line no-console
            console.warn(
              `persistedSignal: onSchemaFailure callback for "${key}" threw.`,
              callbackError,
            );
          }
        }
      }
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

/**
 * A namespaced persistence surface — exposes a `persistedSignal` that
 * prepends a fixed prefix to every storage key, joined by `":"`.
 */
export interface StorageNamespace {
  /**
   * Like {@link persistedSignal}, but the storage key is transparently
   * rewritten to `${prefix}:${key}`. The underlying storage behaviour is
   * unchanged — SSR-safe, schema-validated, quota-safe.
   */
  persistedSignal<T>(
    key: string,
    initial: T,
    options?: PersistedSignalOptions<T>,
  ): Signal<T>;
}

/**
 * Create a key-prefixed view over `persistedSignal` so several apps on the
 * same origin can coexist without stomping on each other's storage slots.
 *
 * ```ts
 * import { createStorageNamespace } from "@whisq/core/persistence";
 *
 * const app = createStorageNamespace("whisq-todo-app");
 * export const todos = app.persistedSignal<Todo[]>("todos", []);
 * //                                                ^ actual key: "whisq-todo-app:todos"
 * export const settings = app.persistedSignal<Settings>("settings", DEFAULTS);
 * ```
 *
 * Two namespaces with distinct prefixes never collide; within one namespace,
 * keys follow the usual `persistedSignal` shape. The helper is a
 * compositional thin wrapper — calling `app.persistedSignal(k, v, opts)` is
 * exactly equivalent to `persistedSignal(\`${prefix}:${k}\`, v, opts)`.
 *
 * Empty or whitespace prefixes are rejected — they defeat the purpose and
 * most often indicate the caller forgot to interpolate an app name.
 */
export function createStorageNamespace(prefix: string): StorageNamespace {
  if (typeof prefix !== "string" || prefix.trim().length === 0) {
    throw new TypeError(
      "createStorageNamespace: prefix must be a non-empty string",
    );
  }

  return {
    persistedSignal<T>(
      key: string,
      initial: T,
      options?: PersistedSignalOptions<T>,
    ): Signal<T> {
      return persistedSignal<T>(`${prefix}:${key}`, initial, options);
    },
  };
}
