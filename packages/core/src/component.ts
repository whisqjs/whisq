// ============================================================================
// Whisq Core — Component Model
// Components are functions. No classes. No decorators. No magic.
// AI generates these correctly on the first attempt.
// ============================================================================

import { signal, effect } from "./reactive.js";
import type { WhisqNode } from "./elements.js";
import { WhisqStructureError, describeValue } from "./dev-errors.js";

/**
 * Shapes a component's setup can return. A plain `WhisqNode` is the
 * original contract. A zero-arg function (e.g. the return value of
 * `match()` / `when()` / a bare `() => div(...)`) is lifted at the
 * runtime boundary — see WHISQ-121.
 */
type ComponentSetupReturn = WhisqNode | (() => unknown);

type CleanupFn = () => void;

// ── Context (provide/inject) ───────────────────────────────────────────────

export interface InjectionKey<T> {
  /** Phantom field — exists only for type inference, never assigned at runtime. */
  readonly _type?: T;
  readonly defaultValue: T | undefined;
}

/**
 * Create a typed context token for provide/inject.
 *
 * ```ts
 * const ThemeCtx = createContext("light");
 * ```
 */
export function createContext<T>(defaultValue?: T): InjectionKey<T> {
  return { defaultValue };
}

// Component context stack for lifecycle hooks
const contextStack: ComponentContext[] = [];

interface ComponentContext {
  mounted: (() => void)[];
  cleanups: CleanupFn[];
  disposed: boolean;
  provided: Map<InjectionKey<any>, unknown>;
  parent: ComponentContext | null;
}

export interface ComponentDef<P = {}> {
  (props: P): WhisqNode;
  __whisq_component: true;
}

// ── Component ───────────────────────────────────────────────────────────────

/**
 * Define a component. Components are setup functions that return an element
 * (a `WhisqNode` — the value you get from calling `div(...)`, `span(...)`,
 * etc.). Props are a plain typed object. Lifecycle via onMount/onCleanup.
 *
 * ```ts
 * const Counter = component((props: { initial?: number }) => {
 *   const count = signal(props.initial ?? 0);
 *
 *   onMount(() => console.log("mounted!"));
 *   onCleanup(() => console.log("cleaned up!"));
 *
 *   return div(
 *     span(() => count.value),
 *     button({ onclick: () => count.value++ }, "+"),
 *   );
 * });
 * ```
 */
export function component<P extends Record<string, any> = {}>(
  setup: (props: P) => ComponentSetupReturn,
): ComponentDef<P> {
  const def = ((props: P) => {
    const parentCtx = contextStack[contextStack.length - 1] ?? null;
    const ctx: ComponentContext = {
      mounted: [],
      cleanups: [],
      disposed: false,
      provided: new Map(),
      parent: parentCtx,
    };

    contextStack.push(ctx);
    let raw: ComponentSetupReturn;
    try {
      raw = setup(props);
    } finally {
      contextStack.pop();
    }

    // WHISQ-121: setup may return a function (the shape match() / when() /
    // an ad-hoc `() => div(...)` produces). Lift it so callers don't need
    // a sacrificial wrapper div whose only job is to host the function
    // child.
    const node: WhisqNode =
      typeof raw === "function" ? liftFunctionChild(raw) : raw;

    if (process.env.NODE_ENV !== "production") {
      if (
        node == null ||
        typeof node !== "object" ||
        !("el" in node) ||
        !("dispose" in node)
      ) {
        throw new WhisqStructureError({
          element: "component",
          expected:
            "setup to return a WhisqNode (an element call like `div(...)`) or a function child (the shape `match()` / `when()` produces)",
          received: describeValue(raw),
          hint: "Return the root element from your setup function: `return div(...)`. A `match()` / `when()` return works directly — no wrapper div needed. Bare strings, numbers, arrays, and null aren't valid component roots — wrap them in an element or a function.",
        });
      }
    }

    // Run mount callbacks on next microtask (after DOM insertion)
    queueMicrotask(() => {
      for (const fn of ctx.mounted) fn();
    });

    // Wrap dispose to run cleanups
    const originalDispose = node.dispose;
    node.dispose = () => {
      ctx.disposed = true;
      for (const fn of ctx.cleanups) fn();
      ctx.parent = null;
      ctx.provided.clear();
      originalDispose();
    };

    return node;
  }) as ComponentDef<P>;

  def.__whisq_component = true;
  return def;
}

/**
 * Wrap a function-child return from setup in a minimal WhisqNode that
 * manages rendering the function's result between start/end markers on a
 * DocumentFragment. Same pattern as `errorBoundary` and keyed `each` —
 * markers survive fragment-insertion and stay in the real parent after
 * mount, so the effect can re-render in place across source changes.
 *
 * Scope: handles the common `match()` / `when()` / `() => div(...)` case
 * where the function returns a WhisqNode / string / number / null. Nested
 * function returns (`() => () => x`) are rejected in dev so callers don't
 * build unexpectedly-deep reactive trees at the component root — if you
 * need that, wrap in an element.
 */
function liftFunctionChild(fn: () => unknown): WhisqNode {
  const startMarker = document.createComment("whisq-component-start");
  const endMarker = document.createComment("whisq-component-end");
  const fragment = document.createDocumentFragment();
  fragment.appendChild(startMarker);
  fragment.appendChild(endMarker);

  let currentWhisqNode: WhisqNode | null = null;
  let currentTextNodes: Node[] = [];

  function clearCurrent(): void {
    if (currentWhisqNode) {
      currentWhisqNode.el.parentNode?.removeChild(currentWhisqNode.el);
      currentWhisqNode.dispose();
      currentWhisqNode = null;
    }
    for (const n of currentTextNodes) {
      n.parentNode?.removeChild(n);
    }
    currentTextNodes = [];
  }

  const effectDispose = effect(() => {
    clearCurrent();
    const result = fn();
    const parent = startMarker.parentNode;
    if (!parent) return; // not yet mounted (fragment still detached)
    if (result == null || result === false || result === true) return;

    if (typeof result === "string" || typeof result === "number") {
      const textNode = document.createTextNode(String(result));
      parent.insertBefore(textNode, endMarker);
      currentTextNodes.push(textNode);
      return;
    }

    if (
      typeof result === "object" &&
      result !== null &&
      "__whisq" in result &&
      "el" in result &&
      "dispose" in result
    ) {
      const whisqNode = result as WhisqNode;
      parent.insertBefore(whisqNode.el, endMarker);
      currentWhisqNode = whisqNode;
      return;
    }

    if (process.env.NODE_ENV !== "production") {
      throw new WhisqStructureError({
        element: "component",
        expected:
          "the component-root function child to yield a WhisqNode / string / number / null",
        received: describeValue(result),
        hint:
          typeof result === "function"
            ? "Nested function children at the component root aren't supported — unwrap one layer, or wrap the outer return in an element (`div(() => ...)`)."
            : "Arrays and plain objects aren't valid component-root returns. Wrap in an element function like `div(...)` instead.",
      });
    }
  });

  return {
    __whisq: true,
    el: fragment,
    disposers: [effectDispose, clearCurrent],
    dispose() {
      effectDispose();
      clearCurrent();
    },
  };
}

// ── Lifecycle Hooks ─────────────────────────────────────────────────────────

/**
 * Register a callback to run after the component mounts.
 * Can return a cleanup function.
 *
 * ```ts
 * onMount(() => {
 *   const timer = setInterval(() => tick(), 1000);
 *   return () => clearInterval(timer);
 * });
 * ```
 */
export function onMount(fn: () => void | CleanupFn): void {
  const ctx = getCurrentContext("onMount");
  ctx.mounted.push(() => {
    const cleanup = fn();
    if (typeof cleanup === "function") {
      ctx.cleanups.push(cleanup);
    }
  });
}

/**
 * Register a cleanup function that runs when the component unmounts.
 *
 * ```ts
 * onCleanup(() => subscription.unsubscribe());
 * ```
 */
export function onCleanup(fn: CleanupFn): void {
  const ctx = getCurrentContext("onCleanup");
  ctx.cleanups.push(fn);
}

// ── useHead() — Reactive Head Management ───────────────────────────────────

interface HeadMetaConfig {
  [key: string]: string | (() => string);
}

interface HeadConfig {
  title?: string | (() => string);
  meta?: HeadMetaConfig[];
  link?: Record<string, string>[];
}

/**
 * Reactively manage document title, meta tags, and link tags.
 * Must be called inside a component() setup function.
 * Tags are automatically removed when the component unmounts.
 *
 * ```ts
 * useHead({
 *   title: () => `${page.value} — Whisq App`,
 *   meta: [{ name: "description", content: () => desc.value }],
 *   link: [{ rel: "stylesheet", href: "/style.css" }],
 * })
 * ```
 */
export function useHead(config: HeadConfig): void {
  const ctx = getCurrentContext("useHead");
  const cleanups: CleanupFn[] = [];

  // Title
  if (config.title !== undefined) {
    if (typeof config.title === "function") {
      const titleFn = config.title;
      const dispose = effect(() => {
        document.title = titleFn();
      });
      cleanups.push(dispose);
    } else {
      document.title = config.title;
    }
  }

  // Meta tags
  if (config.meta) {
    for (const metaDef of config.meta) {
      const el = document.createElement("meta");
      el.setAttribute("data-whisq-head", "");

      for (const [key, value] of Object.entries(metaDef)) {
        if (typeof value === "function") {
          const fn = value;
          const dispose = effect(() => {
            el.setAttribute(key, fn());
          });
          cleanups.push(dispose);
        } else {
          el.setAttribute(key, value);
        }
      }

      document.head.appendChild(el);
      cleanups.push(() => el.remove());
    }
  }

  // Link tags
  if (config.link) {
    for (const linkDef of config.link) {
      const el = document.createElement("link");
      el.setAttribute("data-whisq-head", "");

      for (const [key, value] of Object.entries(linkDef)) {
        el.setAttribute(key, value);
      }

      document.head.appendChild(el);
      cleanups.push(() => el.remove());
    }
  }

  // Register all cleanups with the component
  for (const fn of cleanups) {
    ctx.cleanups.push(fn);
  }
}

// ── Context API ────────────────────────────────────────────────────────────

/**
 * Provide a value for a context key. Descendant components can read it via inject().
 *
 * ```ts
 * provide(ThemeCtx, "dark");
 * ```
 */
export function provide<T>(key: InjectionKey<T>, value: T): void {
  const ctx = getCurrentContext("provide");
  ctx.provided.set(key, value);
}

/**
 * Inject a value provided by an ancestor component. Falls back to the default
 * value from createContext() if no provider is found.
 *
 * ```ts
 * const theme = inject(ThemeCtx); // "dark" or default
 * ```
 */
export function inject<T>(key: InjectionKey<T>): T | undefined {
  const ctx = getCurrentContext("inject");

  // Walk up the context chain to find the nearest provider
  let current: ComponentContext | null = ctx;
  while (current) {
    if (current.provided.has(key)) {
      return current.provided.get(key) as T;
    }
    current = current.parent;
  }

  return key.defaultValue;
}

// ── Resource (Async Data) ───────────────────────────────────────────────────

export interface Resource<T> {
  data: () => T | undefined;
  loading: () => boolean;
  error: () => Error | undefined;
  refetch: () => void;
  /**
   * Synchronously set the resource's data without fetching. Useful for
   * optimistic updates — "add todo immediately, roll back on error."
   * Accepts a value or an updater function that receives the previous value.
   */
  mutate: (next: T | ((prev: T | undefined) => T)) => void;
}

export interface ResourceOptions<T> {
  /** Initial value for `data()` before the first fetch resolves. */
  initialValue?: T;
  /**
   * If true (default), `data()` holds the previous value during refetches.
   * If false, `data()` resets to `undefined` while a refetch is in flight.
   */
  keepPrevious?: boolean;
}

export interface ResourceSourceOptions<T, S> extends ResourceOptions<T> {
  /** Reactive source — fetcher re-runs when this signal changes. */
  source: () => S;
}

type Fetcher<T, S> =
  | ((opts: { signal: AbortSignal }) => Promise<T>)
  | ((source: S, opts: { signal: AbortSignal }) => Promise<T>);

/**
 * Fetch async data with reactive loading/error states, cancellation,
 * optimistic mutation, and optional reactive source dependencies.
 *
 * ```ts
 * // Simple fetch
 * const users = resource(({ signal }) =>
 *   fetch("/api/users", { signal }).then(r => r.json())
 * );
 *
 * // Dependent on a route param
 * const user = resource(
 *   (id, { signal }) => fetch(`/api/users/${id}`, { signal }).then(r => r.json()),
 *   { source: () => route.params.value.id }
 * );
 *
 * // Optimistic update
 * users.mutate(prev => [...(prev ?? []), newUser]);
 * ```
 *
 * - `{ signal }` aborts on refetch and when a newer request starts.
 * - Stale responses are dropped (a newer fetch always wins).
 * - `data()` preserves the previous value during refetch by default;
 *   set `keepPrevious: false` to reset to `undefined`.
 */
export function resource<T>(
  fetcher: (opts: { signal: AbortSignal }) => Promise<T>,
  options?: ResourceOptions<T>,
): Resource<T>;
export function resource<T, S>(
  fetcher: (source: S, opts: { signal: AbortSignal }) => Promise<T>,
  options: ResourceSourceOptions<T, S>,
): Resource<T>;
export function resource<T, S = undefined>(
  fetcher: Fetcher<T, S>,
  options?: ResourceOptions<T> | ResourceSourceOptions<T, S>,
): Resource<T> {
  const data = signal<T | undefined>(options?.initialValue);
  const loading = signal(true);
  const error = signal<Error | undefined>(undefined);
  const keepPrevious = options?.keepPrevious !== false;
  const sourceFn = options && "source" in options ? options.source : undefined;

  let currentController: AbortController | null = null;
  let requestId = 0;

  const execute = async () => {
    currentController?.abort();
    const controller = new AbortController();
    currentController = controller;
    const myId = ++requestId;

    loading.value = true;
    error.value = undefined;
    if (!keepPrevious) data.value = undefined;

    try {
      const opts = { signal: controller.signal };
      const result = sourceFn
        ? await (fetcher as (s: S, o: typeof opts) => Promise<T>)(
            sourceFn(),
            opts,
          )
        : await (fetcher as (o: typeof opts) => Promise<T>)(opts);

      if (myId === requestId) {
        data.value = result;
      }
    } catch (e) {
      if (myId !== requestId || controller.signal.aborted) return;
      error.value = e instanceof Error ? e : new Error(String(e));
    } finally {
      if (myId === requestId) {
        loading.value = false;
      }
    }
  };

  if (sourceFn) {
    effect(() => {
      sourceFn();
      execute();
    });
  } else {
    execute();
  }

  return {
    data: () => data.value,
    loading: () => loading.value,
    error: () => error.value,
    refetch: execute,
    mutate: (next) => {
      data.value =
        typeof next === "function"
          ? (next as (prev: T | undefined) => T)(data.value)
          : next;
    },
  };
}

// ── Internal ────────────────────────────────────────────────────────────────

function getCurrentContext(hookName: string): ComponentContext {
  const ctx = contextStack[contextStack.length - 1];
  if (!ctx) {
    throw new Error(
      `Whisq: ${hookName}() must be called inside a component() setup function.`,
    );
  }
  return ctx;
}
