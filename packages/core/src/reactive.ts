// ============================================================================
// Whisq Core — Reactive Primitives
// The entire reactive system in ~150 lines. Signals, computed, effects.
// ============================================================================

type Subscriber = () => void;

// Internal tracking
let currentSubscriber: Subscriber | null = null;
let currentDeps: Set<Set<Subscriber>> | null = null;
let batchDepth = 0;
const pendingEffects = new Set<Subscriber>();

// Error boundary support — effects capture the active handler at creation time
let currentEffectErrorHandler: ((error: Error) => void) | null = null;

/** @internal Used by errorBoundary — not part of the public API. */
export function setEffectErrorHandler(
  handler: ((error: Error) => void) | null,
): ((error: Error) => void) | null {
  const prev = currentEffectErrorHandler;
  currentEffectErrorHandler = handler;
  return prev;
}

// ── Signal ──────────────────────────────────────────────────────────────────

export interface ReadonlySignal<T> {
  readonly value: T;
  peek(): T;
  subscribe(fn: (value: T) => void): () => void;
}

export interface Signal<T> extends ReadonlySignal<T> {
  value: T;
  set(value: T): void;
  update(fn: (current: T) => T): void;
}

/** Type guard: checks if a value is a Whisq Signal. */
export function isSignal(value: unknown): value is Signal<unknown> {
  return (
    value !== null &&
    typeof value === "object" &&
    "value" in value &&
    "peek" in value &&
    "subscribe" in value &&
    typeof (value as Record<string, unknown>).peek === "function"
  );
}

/**
 * Create a reactive signal.
 *
 * ```ts
 * const count = signal(0);
 * count.value++;
 * ```
 */
export function signal<T>(initialValue: T): Signal<T> {
  let _value = initialValue;
  const subscribers = new Set<Subscriber>();

  const sig: Signal<T> = {
    get value(): T {
      if (currentSubscriber) {
        subscribers.add(currentSubscriber);
        if (currentDeps) currentDeps.add(subscribers);
      }
      return _value;
    },

    set value(newValue: T) {
      if (Object.is(_value, newValue)) return;
      _value = newValue;
      notify(subscribers);
    },

    peek(): T {
      return _value;
    },

    set(newValue: T) {
      sig.value = newValue;
    },

    update(fn: (current: T) => T) {
      sig.value = fn(_value);
    },

    subscribe(fn: (value: T) => void): () => void {
      const sub: Subscriber = () => fn(sig.value);
      subscribers.add(sub);
      fn(_value); // immediate call
      return () => subscribers.delete(sub);
    },
  };

  return sig;
}

// ── Computed ────────────────────────────────────────────────────────────────

/**
 * Create a derived signal that auto-updates when dependencies change.
 *
 * ```ts
 * const double = computed(() => count.value * 2);
 * ```
 */
export function computed<T>(fn: () => T): ReadonlySignal<T> {
  let _value: T;
  let dirty = true;
  const subscribers = new Set<Subscriber>();
  const computedDeps = new Set<Set<Subscriber>>();

  const recompute: Subscriber = () => {
    dirty = true;
    notify(subscribers);
  };

  function cleanupComputedDeps() {
    for (const depSet of computedDeps) {
      depSet.delete(recompute);
    }
    computedDeps.clear();
  }

  function evaluate(): void {
    cleanupComputedDeps();
    const prevSubscriber = currentSubscriber;
    const prevDeps = currentDeps;
    currentSubscriber = recompute;
    currentDeps = computedDeps;
    try {
      _value = fn();
    } finally {
      currentSubscriber = prevSubscriber;
      currentDeps = prevDeps;
    }
    dirty = false;
  }

  const comp: ReadonlySignal<T> = {
    get value(): T {
      if (currentSubscriber) {
        subscribers.add(currentSubscriber);
        if (currentDeps) currentDeps.add(subscribers);
      }
      if (dirty) {
        evaluate();
      }
      return _value;
    },

    peek(): T {
      if (dirty) {
        const prevSubscriber = currentSubscriber;
        const prevDeps = currentDeps;
        currentSubscriber = null;
        currentDeps = null;
        try {
          _value = fn();
        } finally {
          currentSubscriber = prevSubscriber;
          currentDeps = prevDeps;
        }
        dirty = false;
      }
      return _value;
    },

    subscribe(fn: (value: T) => void): () => void {
      const sub: Subscriber = () => fn(comp.value);
      subscribers.add(sub);
      fn(comp.value);
      return () => subscribers.delete(sub);
    },
  };

  return comp;
}

// ── Effect ──────────────────────────────────────────────────────────────────

/**
 * Run a side effect that re-executes when dependencies change.
 * Returns a dispose function.
 *
 * ```ts
 * const dispose = effect(() => console.log(count.value));
 * ```
 */
export function effect(fn: () => void | (() => void)): () => void {
  let cleanup: (() => void) | void;
  let disposed = false;
  let deps = new Set<Set<Subscriber>>();
  const boundErrorHandler = currentEffectErrorHandler;

  function cleanupDeps() {
    for (const depSet of deps) {
      depSet.delete(execute);
    }
    deps.clear();
  }

  const execute: Subscriber = () => {
    if (disposed) return;
    if (cleanup) {
      cleanup();
      cleanup = undefined;
    }

    // Remove from old dependency sets before re-running
    cleanupDeps();

    const prevSubscriber = currentSubscriber;
    const prevDeps = currentDeps;
    currentSubscriber = execute;
    currentDeps = deps;
    try {
      cleanup = fn();
    } catch (e) {
      if (boundErrorHandler) {
        currentSubscriber = prevSubscriber;
        currentDeps = prevDeps;
        disposed = true;
        cleanupDeps();
        boundErrorHandler(e instanceof Error ? e : new Error(String(e)));
        return;
      }
      throw e;
    } finally {
      currentSubscriber = prevSubscriber;
      currentDeps = prevDeps;
    }
  };

  execute();

  return () => {
    disposed = true;
    cleanupDeps();
    if (cleanup) cleanup();
  };
}

// ── Batch ───────────────────────────────────────────────────────────────────

/**
 * Batch multiple signal updates into a single re-render.
 *
 * ```ts
 * batch(() => {
 *   name.value = "Whisq";
 *   version.value = "1.0";
 * });
 * ```
 */
export function batch(fn: () => void): void {
  batchDepth++;
  try {
    fn();
  } finally {
    batchDepth--;
    if (batchDepth === 0) {
      const effects = [...pendingEffects];
      pendingEffects.clear();
      for (const eff of effects) eff();
    }
  }
}

// ── Internal ────────────────────────────────────────────────────────────────

function notify(subscribers: Set<Subscriber>): void {
  // Snapshot to avoid infinite loops when effects unsubscribe/resubscribe during iteration
  const snapshot = [...subscribers];
  for (const sub of snapshot) {
    if (batchDepth > 0) {
      pendingEffects.add(sub);
    } else {
      sub();
    }
  }
}
