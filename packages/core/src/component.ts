// ============================================================================
// Whisq Core — Component Model
// Components are functions. No classes. No decorators. No magic.
// AI generates these correctly on the first attempt.
// ============================================================================

import { signal, effect } from "./reactive.js";
import type { WhisqTemplate } from "./template.js";

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
  (props: P): WhisqTemplate;
  __whisq_component: true;
}

// ── Component ───────────────────────────────────────────────────────────────

/**
 * Define a component. Components are setup functions that return a template.
 * Props are a plain typed object. Lifecycle via onMount/onCleanup.
 *
 * ```ts
 * const Counter = component((props: { initial?: number }) => {
 *   const count = signal(props.initial ?? 0);
 *
 *   onMount(() => console.log("mounted!"));
 *   onCleanup(() => console.log("cleaned up!"));
 *
 *   return html`
 *     <div>
 *       <span>${() => count.value}</span>
 *       <button @click="${() => count.value++}">+</button>
 *     </div>
 *   `;
 * });
 * ```
 */
export function component<P extends Record<string, any> = {}>(
  setup: (props: P) => WhisqTemplate,
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
    let template: WhisqTemplate;
    try {
      template = setup(props);
    } finally {
      contextStack.pop();
    }

    // Run mount callbacks on next microtask (after DOM insertion)
    queueMicrotask(() => {
      for (const fn of ctx.mounted) fn();
    });

    // Wrap dispose to run cleanups
    const originalDispose = template.dispose;
    template.dispose = () => {
      ctx.disposed = true;
      for (const fn of ctx.cleanups) fn();
      ctx.parent = null;
      ctx.provided.clear();
      originalDispose();
    };

    return template;
  }) as ComponentDef<P>;

  def.__whisq_component = true;
  return def;
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
}

/**
 * Fetch async data with reactive loading/error states.
 *
 * ```ts
 * const users = resource(() =>
 *   fetch("/api/users").then(r => r.json())
 * );
 *
 * // In template:
 * html`
 *   ${() => users.loading() ? "Loading..." : ""}
 *   ${() => users.error() ? users.error().message : ""}
 *   ${() => users.data()?.map(u => html`<p>${u.name}</p>`)}
 * `;
 * ```
 */
export function resource<T>(fetcher: () => Promise<T>): Resource<T> {
  const data = signal<T | undefined>(undefined);
  const loading = signal(true);
  const error = signal<Error | undefined>(undefined);

  const execute = async () => {
    loading.value = true;
    error.value = undefined;
    try {
      data.value = await fetcher();
    } catch (e) {
      error.value = e instanceof Error ? e : new Error(String(e));
    } finally {
      loading.value = false;
    }
  };

  execute();

  return {
    data: () => data.value,
    loading: () => loading.value,
    error: () => error.value,
    refetch: execute,
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
