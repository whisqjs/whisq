// ============================================================================
// Whisq Core — Reactive Collections
//
// signalMap<K, V> and signalSet<T> — Map/Set with per-key reactivity so
// effects only re-run when the keys they actually read change. Built on
// top of signal() so they participate in the same tracking/batching system
// as the rest of the reactive core.
// ============================================================================

import {
  signal,
  computed,
  type Signal,
  type ReadonlySignal,
} from "./reactive.js";

const MISSING: unique symbol = Symbol("whisq.collections.missing");
type Missing = typeof MISSING;

// ── signalMap ──────────────────────────────────────────────────────────────

export interface SignalMap<K, V> {
  get(key: K): V | undefined;
  has(key: K): boolean;
  set(key: K, value: V): SignalMap<K, V>;
  delete(key: K): boolean;
  clear(): void;
  readonly size: number;
  keys(): IterableIterator<K>;
  values(): IterableIterator<V>;
  entries(): IterableIterator<[K, V]>;
  [Symbol.iterator](): IterableIterator<[K, V]>;
  forEach(fn: (value: V, key: K, map: SignalMap<K, V>) => void): void;
}

/**
 * A reactive Map where each key has its own subscriber set. Effects that read
 * a specific key via `.get()` or `.has()` re-run only when that key changes;
 * effects that iterate or read `.size` re-run on any structural change.
 *
 * ```ts
 * const users = signalMap<string, User>();
 * users.set("u1", alice);
 * effect(() => console.log(users.get("u1")?.name));  // tracks "u1" only
 * users.set("u2", bob);   // effect does NOT re-run
 * users.set("u1", carol); // effect re-runs
 * ```
 */
export function signalMap<K, V>(
  initial?: Iterable<readonly [K, V]>,
): SignalMap<K, V> {
  const data = new Map<K, V>(initial as Iterable<[K, V]> | undefined);
  const keySignals = new Map<K, Signal<V | Missing>>();
  const structure = signal(0);

  function keySig(key: K): Signal<V | Missing> {
    let s = keySignals.get(key);
    if (!s) {
      s = signal<V | Missing>(data.has(key) ? (data.get(key) as V) : MISSING);
      keySignals.set(key, s);
    }
    return s;
  }

  function bumpStructure(): void {
    structure.value = structure.value + 1;
  }

  const map: SignalMap<K, V> = {
    get(key: K): V | undefined {
      const v = keySig(key).value;
      return v === MISSING ? undefined : v;
    },

    has(key: K): boolean {
      return keySig(key).value !== MISSING;
    },

    set(key: K, value: V): SignalMap<K, V> {
      const existed = data.has(key);
      data.set(key, value);
      keySig(key).value = value;
      if (!existed) bumpStructure();
      return map;
    },

    delete(key: K): boolean {
      if (!data.has(key)) return false;
      data.delete(key);
      const sig = keySignals.get(key);
      if (sig) sig.value = MISSING;
      bumpStructure();
      return true;
    },

    clear(): void {
      if (data.size === 0) return;
      for (const k of [...data.keys()]) {
        data.delete(k);
        const sig = keySignals.get(k);
        if (sig) sig.value = MISSING;
      }
      bumpStructure();
    },

    get size(): number {
      structure.value; // track structural changes
      return data.size;
    },

    keys(): IterableIterator<K> {
      structure.value; // track
      return data.keys();
    },

    values(): IterableIterator<V> {
      structure.value;
      return data.values();
    },

    entries(): IterableIterator<[K, V]> {
      structure.value;
      return data.entries();
    },

    [Symbol.iterator](): IterableIterator<[K, V]> {
      structure.value;
      return data.entries();
    },

    forEach(fn: (value: V, key: K, m: SignalMap<K, V>) => void): void {
      structure.value;
      data.forEach((v, k) => fn(v, k, map));
    },
  };

  return map;
}

// ── signalSet ──────────────────────────────────────────────────────────────

export interface SignalSet<T> {
  has(value: T): boolean;
  add(value: T): SignalSet<T>;
  delete(value: T): boolean;
  clear(): void;
  readonly size: number;
  keys(): IterableIterator<T>;
  values(): IterableIterator<T>;
  entries(): IterableIterator<[T, T]>;
  [Symbol.iterator](): IterableIterator<T>;
  forEach(fn: (value: T, value2: T, set: SignalSet<T>) => void): void;
}

/**
 * A reactive Set with per-value membership signals — effects that read
 * `.has(x)` re-run only when `x` is added or removed, not on other changes.
 *
 * ```ts
 * const selected = signalSet<string>();
 * effect(() => console.log(selected.has("admin")));  // tracks "admin" only
 * selected.add("user");   // effect does NOT re-run
 * selected.add("admin");  // effect re-runs
 * ```
 */
export function signalSet<T>(initial?: Iterable<T>): SignalSet<T> {
  const data = new Set<T>(initial);
  const memberSignals = new Map<T, Signal<boolean>>();
  const structure = signal(0);

  function memberSig(value: T): Signal<boolean> {
    let s = memberSignals.get(value);
    if (!s) {
      s = signal<boolean>(data.has(value));
      memberSignals.set(value, s);
    }
    return s;
  }

  function bumpStructure(): void {
    structure.value = structure.value + 1;
  }

  const set: SignalSet<T> = {
    has(value: T): boolean {
      return memberSig(value).value;
    },

    add(value: T): SignalSet<T> {
      if (data.has(value)) return set;
      data.add(value);
      memberSig(value).value = true;
      bumpStructure();
      return set;
    },

    delete(value: T): boolean {
      if (!data.has(value)) return false;
      data.delete(value);
      const sig = memberSignals.get(value);
      if (sig) sig.value = false;
      bumpStructure();
      return true;
    },

    clear(): void {
      if (data.size === 0) return;
      for (const v of [...data]) {
        data.delete(v);
        const sig = memberSignals.get(v);
        if (sig) sig.value = false;
      }
      bumpStructure();
    },

    get size(): number {
      structure.value;
      return data.size;
    },

    keys(): IterableIterator<T> {
      structure.value;
      return data.values();
    },

    values(): IterableIterator<T> {
      structure.value;
      return data.values();
    },

    entries(): IterableIterator<[T, T]> {
      structure.value;
      return data.entries();
    },

    [Symbol.iterator](): IterableIterator<T> {
      structure.value;
      return data.values();
    },

    forEach(fn: (v: T, v2: T, s: SignalSet<T>) => void): void {
      structure.value;
      data.forEach((v) => fn(v, v, set));
    },
  };

  return set;
}

// ── partition ──────────────────────────────────────────────────────────────

/**
 * Split a signal-held array into two derived signals — one with items that
 * match the predicate, one with items that don't. Both sides re-compute
 * when the source changes; source order is preserved on both sides.
 *
 * ```ts
 * const todos = signal<Todo[]>([...]);
 * const [pending, done] = partition(() => todos.value, (t) => !t.done);
 *
 * p(() => `${pending.value.length} left`);
 * p(() => `${done.value.length} done`);
 * button({ onclick: () => todos.value = pending.value }, "Clear completed");
 * ```
 *
 * Each side is an independent `ReadonlySignal<T[]>` — subscribing to one
 * does not subscribe to the other, and each re-runs its own effects only
 * when its portion of the result would change in content. (That's
 * reference-equality on the produced arrays, matching `computed()`
 * semantics — structural equality is the caller's job if they need it.)
 */
export function partition<T>(
  source: () => T[],
  predicate: (item: T) => boolean,
): [ReadonlySignal<T[]>, ReadonlySignal<T[]>] {
  return [
    computed(() => source().filter(predicate)),
    computed(() => source().filter((item) => !predicate(item))),
  ];
}
