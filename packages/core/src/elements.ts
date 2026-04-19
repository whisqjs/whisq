// ============================================================================
// Whisq Core — Hyperscript Element Functions
// The primary way to build UIs in Whisq. Pure functions, full TypeScript.
//
//   div({ class: "app" },
//     h1("Hello Whisq"),
//     button({ onclick: () => count.value++ }, () => count.value),
//   )
//
// Every HTML element is a typed function. No templates. No strings.
// AI generates this correctly because it's just function calls.
// ============================================================================

import { effect, isSignal, setEffectErrorHandler } from "./reactive.js";
import { reconcileKeyed, type KeyedEntry } from "./reconcile.js";
import type { Ref } from "./ref.js";

// ── Types ───────────────────────────────────────────────────────────────────

type Child =
  | string
  | number
  | boolean
  | null
  | undefined
  | Node
  | WhisqNode
  | (() => Child | Child[])
  | Child[];

type EventHandler<E extends Event = Event> = (event: E) => void;

type ReactiveProp<T> = T | (() => T);

interface BaseProps {
  ref?: Ref;
  class?: ReactiveProp<string | undefined>;
  id?: ReactiveProp<string | undefined>;
  style?: ReactiveProp<string | undefined>;
  hidden?: ReactiveProp<boolean>;
  title?: ReactiveProp<string | undefined>;
  [key: `data-${string}`]: ReactiveProp<string | undefined>;
}

interface InputProps extends BaseProps {
  type?: string;
  value?: ReactiveProp<string | number>;
  checked?: ReactiveProp<boolean>;
  placeholder?: string;
  disabled?: ReactiveProp<boolean>;
  readonly?: ReactiveProp<boolean>;
  name?: string;
  min?: string | number;
  max?: string | number;
  step?: string | number;
  required?: boolean;
  autofocus?: boolean;
  oninput?: EventHandler<InputEvent>;
  onchange?: EventHandler;
  onfocus?: EventHandler<FocusEvent>;
  onblur?: EventHandler<FocusEvent>;
  onkeydown?: EventHandler<KeyboardEvent>;
  onkeyup?: EventHandler<KeyboardEvent>;
}

interface SelectProps extends BaseProps {
  value?: ReactiveProp<string>;
  disabled?: ReactiveProp<boolean>;
  name?: string;
  onchange?: EventHandler;
}

interface CommonProps extends BaseProps {
  onclick?: EventHandler<MouseEvent>;
  ondblclick?: EventHandler<MouseEvent>;
  onmouseenter?: EventHandler<MouseEvent>;
  onmouseleave?: EventHandler<MouseEvent>;
  onkeydown?: EventHandler<KeyboardEvent>;
  onsubmit?: EventHandler<SubmitEvent>;
  onfocus?: EventHandler<FocusEvent>;
  onblur?: EventHandler<FocusEvent>;
  role?: string;
  tabindex?: number;
  draggable?: boolean;
}

interface FormProps extends CommonProps {
  action?: string;
  method?: string;
  enctype?: string;
  novalidate?: boolean;
}

interface AnchorProps extends CommonProps {
  href?: ReactiveProp<string>;
  target?: string;
  rel?: string;
}

interface ImgProps extends CommonProps {
  src?: ReactiveProp<string>;
  alt?: string;
  width?: number | string;
  height?: number | string;
  loading?: "lazy" | "eager";
}

interface OptionProps extends BaseProps {
  value?: string;
  selected?: ReactiveProp<boolean>;
  disabled?: boolean;
}

// ── WhisqNode ───────────────────────────────────────────────────────────────

export interface WhisqNode {
  __whisq: true;
  el: Node;
  disposers: (() => void)[];
  dispose(): void;
}

// ── Core: h() ───────────────────────────────────────────────────────────────

/**
 * Create a DOM element with reactive props and children.
 * This is the low-level function. Prefer named helpers (div, span, button...).
 *
 * ```ts
 * h("div", { class: "card" }, h("p", {}, "Hello"));
 * ```
 */
export function h(
  tag: string,
  props?: Record<string, any> | null,
  ...children: Child[]
): WhisqNode {
  const el = document.createElement(tag);
  const disposers: (() => void)[] = [];

  // Apply props
  if (props) {
    for (const [key, value] of Object.entries(props)) {
      if (key === "ref") {
        // Ref: signal or callback
        if (isSignal(value)) {
          // Signal ref — use peek to confirm it's a real signal, not a random object with .value
          value.value = el;
          disposers.push(() => {
            value.value = null;
          });
        } else if (typeof value === "function") {
          // Callback ref
          (value as (el: HTMLElement | null) => void)(el);
          disposers.push(() => {
            (value as (el: HTMLElement | null) => void)(null);
          });
        }
        continue;
      }
      if (key.startsWith("on") && typeof value === "function") {
        // Event handler: onclick, oninput, etc.
        const eventName = key.slice(2).toLowerCase();
        el.addEventListener(eventName, value as EventListener);
        disposers.push(() =>
          el.removeEventListener(eventName, value as EventListener),
        );
      } else if (key.startsWith("on") && typeof value === "string") {
        // Block string-valued event handlers (XSS vector)
        console.warn(
          `[whisq] Blocked string event handler on prop "${key}". Use a function instead.`,
        );
      } else if (typeof value === "function") {
        // Reactive prop: class: () => "active"
        const dispose = effect(() => {
          applyProp(el, key, (value as () => unknown)());
        });
        disposers.push(dispose);
      } else {
        // Static prop
        applyProp(el, key, value);
      }
    }
  }

  // Append children
  for (const child of children) {
    appendChildren(el, child, disposers);
  }

  return {
    __whisq: true,
    el,
    disposers,
    dispose() {
      for (const d of disposers) d();
    },
  };
}

// ── Named Element Helpers ───────────────────────────────────────────────────
// Each HTML tag is a function: div(...), span(...), button(...), etc.
// Two call signatures:
//   div({ class: "foo" }, child1, child2)   — props + children
//   div("text content")                     — shorthand, no props
//   div(child1, child2)                     — children only, no props

function createElement(tag: string) {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any -- internal dispatch; public API is typed via element-specific overloads
  return function (propsOrChild?: any, ...children: Child[]): WhisqNode {
    if (
      propsOrChild === null ||
      propsOrChild === undefined ||
      typeof propsOrChild === "string" ||
      typeof propsOrChild === "number" ||
      typeof propsOrChild === "boolean" ||
      typeof propsOrChild === "function" ||
      propsOrChild instanceof Node ||
      Array.isArray(propsOrChild) ||
      (propsOrChild && propsOrChild.__whisq)
    ) {
      // No props — first arg is a child
      return h(tag, null, propsOrChild, ...children);
    }
    // First arg is props object
    return h(tag, propsOrChild, ...children);
  };
}

// Layout
export const div = createElement("div") as (
  props?: CommonProps | Child,
  ...children: Child[]
) => WhisqNode;
export const span = createElement("span") as (
  props?: CommonProps | Child,
  ...children: Child[]
) => WhisqNode;
export const main = createElement("main") as (
  props?: CommonProps | Child,
  ...children: Child[]
) => WhisqNode;
export const section = createElement("section") as (
  props?: CommonProps | Child,
  ...children: Child[]
) => WhisqNode;
export const article = createElement("article") as (
  props?: CommonProps | Child,
  ...children: Child[]
) => WhisqNode;
export const aside = createElement("aside") as (
  props?: CommonProps | Child,
  ...children: Child[]
) => WhisqNode;
export const header = createElement("header") as (
  props?: CommonProps | Child,
  ...children: Child[]
) => WhisqNode;
export const footer = createElement("footer") as (
  props?: CommonProps | Child,
  ...children: Child[]
) => WhisqNode;
export const nav = createElement("nav") as (
  props?: CommonProps | Child,
  ...children: Child[]
) => WhisqNode;

// Text
export const h1 = createElement("h1") as (
  props?: CommonProps | Child,
  ...children: Child[]
) => WhisqNode;
export const h2 = createElement("h2") as (
  props?: CommonProps | Child,
  ...children: Child[]
) => WhisqNode;
export const h3 = createElement("h3") as (
  props?: CommonProps | Child,
  ...children: Child[]
) => WhisqNode;
export const h4 = createElement("h4") as (
  props?: CommonProps | Child,
  ...children: Child[]
) => WhisqNode;
export const h5 = createElement("h5") as (
  props?: CommonProps | Child,
  ...children: Child[]
) => WhisqNode;
export const h6 = createElement("h6") as (
  props?: CommonProps | Child,
  ...children: Child[]
) => WhisqNode;
export const p = createElement("p") as (
  props?: CommonProps | Child,
  ...children: Child[]
) => WhisqNode;
export const strong = createElement("strong") as (
  props?: CommonProps | Child,
  ...children: Child[]
) => WhisqNode;
export const em = createElement("em") as (
  props?: CommonProps | Child,
  ...children: Child[]
) => WhisqNode;
export const small = createElement("small") as (
  props?: CommonProps | Child,
  ...children: Child[]
) => WhisqNode;
export const pre = createElement("pre") as (
  props?: CommonProps | Child,
  ...children: Child[]
) => WhisqNode;
export const code = createElement("code") as (
  props?: CommonProps | Child,
  ...children: Child[]
) => WhisqNode;

// Interactive
export const button = createElement("button") as (
  props?:
    | (CommonProps & { disabled?: ReactiveProp<boolean>; type?: string })
    | Child,
  ...children: Child[]
) => WhisqNode;
export const a = createElement("a") as (
  props?: AnchorProps | Child,
  ...children: Child[]
) => WhisqNode;

// Forms
export const form = createElement("form") as (
  props?: FormProps | Child,
  ...children: Child[]
) => WhisqNode;
export const input = createElement("input") as (
  props?: InputProps,
) => WhisqNode;
export const textarea = createElement("textarea") as (
  props?: InputProps | Child,
  ...children: Child[]
) => WhisqNode;
export const select = createElement("select") as (
  props?: SelectProps | Child,
  ...children: Child[]
) => WhisqNode;
export const option = createElement("option") as (
  props?: OptionProps | Child,
  ...children: Child[]
) => WhisqNode;
export const label = createElement("label") as (
  props?: (CommonProps & { for?: string }) | Child,
  ...children: Child[]
) => WhisqNode;

// Lists
export const ul = createElement("ul") as (
  props?: CommonProps | Child,
  ...children: Child[]
) => WhisqNode;
export const ol = createElement("ol") as (
  props?: CommonProps | Child,
  ...children: Child[]
) => WhisqNode;
export const li = createElement("li") as (
  props?: CommonProps | Child,
  ...children: Child[]
) => WhisqNode;

// Table
export const table = createElement("table") as (
  props?: CommonProps | Child,
  ...children: Child[]
) => WhisqNode;
export const thead = createElement("thead") as (
  props?: CommonProps | Child,
  ...children: Child[]
) => WhisqNode;
export const tbody = createElement("tbody") as (
  props?: CommonProps | Child,
  ...children: Child[]
) => WhisqNode;
export const tr = createElement("tr") as (
  props?: CommonProps | Child,
  ...children: Child[]
) => WhisqNode;
export const th = createElement("th") as (
  props?: CommonProps | Child,
  ...children: Child[]
) => WhisqNode;
export const td = createElement("td") as (
  props?: CommonProps | Child,
  ...children: Child[]
) => WhisqNode;

// Media
export const img = createElement("img") as (props?: ImgProps) => WhisqNode;
export const video = createElement("video") as (
  props?: CommonProps | Child,
  ...children: Child[]
) => WhisqNode;
export const audio = createElement("audio") as (
  props?: CommonProps | Child,
  ...children: Child[]
) => WhisqNode;

// Misc
export const br = createElement("br") as () => WhisqNode;
export const hr = createElement("hr") as (props?: CommonProps) => WhisqNode;
export const iframe = createElement("iframe") as (
  props?: CommonProps & { src?: string },
) => WhisqNode;

// ── raw() — HTML string fallback ────────────────────────────────────────────

/**
 * Render a raw HTML string into DOM nodes.
 * Use this ONLY when you need to inject HTML that can't be expressed
 * as hyperscript functions (e.g., markdown output, third-party HTML).
 *
 * ```ts
 * div({ class: "content" },
 *   h1("My Post"),
 *   raw(markdownToHtml(post.body)),
 * )
 * ```
 *
 * ⚠️ WARNING: Does not sanitize HTML. Do not pass user input directly.
 */
export function raw(htmlString: string | (() => string)): WhisqNode {
  const container = document.createElement("template");
  const disposers: (() => void)[] = [];
  const marker = document.createComment("whisq-raw");

  if (typeof htmlString === "function") {
    // Reactive raw HTML
    const wrapper = document.createDocumentFragment();
    wrapper.appendChild(marker);

    const dispose = effect(() => {
      const html = htmlString();
      // Remove old content between markers
      while (marker.nextSibling) {
        marker.nextSibling.remove();
      }
      container.innerHTML = html;
      const parent = marker.parentNode;
      if (parent) {
        while (container.content.firstChild) {
          parent.appendChild(container.content.firstChild);
        }
      }
    });

    disposers.push(dispose);
    return {
      __whisq: true,
      el: wrapper,
      disposers,
      dispose() {
        for (const d of disposers) d();
      },
    };
  }

  // Static raw HTML
  container.innerHTML = htmlString.trim();
  const fragment = container.content;
  return { __whisq: true, el: fragment, disposers: [], dispose() {} };
}

// ── when() — Conditional rendering ──────────────────────────────────────────

/**
 * Conditional rendering helper.
 *
 * ```ts
 * div(
 *   when(() => loggedIn.value,
 *     () => p("Welcome back!"),
 *     () => button({ onclick: login }, "Sign In"),
 *   ),
 * )
 * ```
 */
export function when(
  condition: () => boolean,
  then: () => WhisqNode | string | null,
  otherwise?: () => WhisqNode | string | null,
): () => Child {
  return () => (condition() ? then() : otherwise ? otherwise() : null);
}

// ── match() — Multi-branch conditional rendering ───────────────────────────

type MatchRender = () => WhisqNode | string | null;
type MatchBranch = readonly [() => boolean, MatchRender];

/**
 * Multi-branch conditional renderer. Evaluates branches in order and renders
 * the first whose predicate returns truthy. An optional trailing fallback
 * (a bare render function, not wrapped in a tuple) renders when no branch
 * matches. Re-evaluates reactively like other children.
 *
 * ```ts
 * div(
 *   match(
 *     [() => users.loading(),    () => p("Loading...")],
 *     [() => !!users.error(),    () => p({ class: "error" }, users.error()!.message)],
 *     [() => !!users.data(),     () => List({ items: users.data()! })],
 *     () => p("No data yet."), // fallback
 *   ),
 * )
 * ```
 *
 * First-true-wins: if two predicates are true, only the earlier branch renders.
 */
export function match(...branches: MatchBranch[]): () => Child;
export function match(...args: [...MatchBranch[], MatchRender]): () => Child;
export function match(...args: Array<MatchBranch | MatchRender>): () => Child {
  const last = args[args.length - 1];
  const hasFallback = typeof last === "function";
  const fallback = hasFallback ? (last as MatchRender) : undefined;
  const branches = (hasFallback ? args.slice(0, -1) : args) as MatchBranch[];

  return () => {
    for (const [predicate, render] of branches) {
      if (predicate()) return render();
    }
    return fallback ? fallback() : null;
  };
}

// ── each() — List rendering ────────────────────────────────────────────────

/**
 * Render a reactive list efficiently.
 *
 * ```ts
 * // Without key — recreates all nodes on change (simple, fine for small lists)
 * ul(
 *   each(() => todos.value, (todo) =>
 *     li(todo.text),
 *   ),
 * )
 *
 * // With key — keyed reconciliation, reuses DOM nodes (efficient for large lists)
 * ul(
 *   each(() => todos.value, (todo) =>
 *     li(todo.text),
 *     { key: (todo) => todo.id },
 *   ),
 * )
 * ```
 */
export function each<T>(
  items: () => T[],
  render: (item: T, index: number) => WhisqNode,
  options?: { key: (item: T) => unknown },
): (() => Child[]) | WhisqNode {
  if (!options?.key) {
    // Non-keyed: simple map (existing behavior)
    return () => items().map((item, i) => render(item, i));
  }

  // Keyed: return a WhisqNode that manages its own reconciliation
  const keyFn = options.key;
  const marker = document.createComment("whisq-each");
  const disposers: (() => void)[] = [];
  let entries: KeyedEntry[] = [];

  // We need a parent — create a fragment to hold the marker initially.
  // The marker will be reparented when appended to the actual DOM.
  const fragment = document.createDocumentFragment();
  fragment.appendChild(marker);

  const dispose = effect(() => {
    const newItems = items();
    const parent = marker.parentNode;
    if (!parent) return;

    entries = reconcileKeyed(parent, marker, entries, newItems, keyFn, render);
  });
  disposers.push(dispose);

  return {
    __whisq: true,
    el: fragment,
    disposers,
    dispose() {
      for (const d of disposers) d();
      for (const entry of entries) {
        entry.node.dispose();
      }
    },
  };
}

// ── errorBoundary() — Error resilience ─────────────────────────────────────

/**
 * Catch errors during child render or effect execution, showing a fallback.
 *
 * ```ts
 * errorBoundary(
 *   (error, retry) => div(
 *     p("Something broke: " + error.message),
 *     button({ onclick: retry }, "Retry"),
 *   ),
 *   () => UnsafeComponent({}),
 * )
 * ```
 *
 * ⚠️ `error.message` may contain untrusted content (e.g., from network
 * responses). Never pass it to `raw()` without sanitization.
 */
export function errorBoundary(
  fallback: (error: Error, retry: () => void) => WhisqNode,
  children: () => WhisqNode,
): WhisqNode {
  const startMarker = document.createComment("whisq-eb-start");
  const endMarker = document.createComment("whisq-eb-end");
  const fragment = document.createDocumentFragment();
  fragment.appendChild(startMarker);
  fragment.appendChild(endMarker);

  let currentNode: WhisqNode | null = null;
  let disposed = false;

  function clearBetweenMarkers() {
    while (startMarker.nextSibling && startMarker.nextSibling !== endMarker) {
      startMarker.nextSibling.remove();
    }
  }

  function handleError(error: Error) {
    if (disposed) return;
    if (currentNode) {
      currentNode.dispose();
      currentNode = null;
    }
    clearBetweenMarkers();
    const parent = startMarker.parentNode;
    if (!parent) return;
    const fallbackNode = fallback(error, retry);
    currentNode = fallbackNode;
    parent.insertBefore(fallbackNode.el, endMarker);
  }

  function retry() {
    if (disposed) return;
    if (currentNode) {
      currentNode.dispose();
      currentNode = null;
    }
    clearBetweenMarkers();
    tryRender();
  }

  function tryRender() {
    const prevHandler = setEffectErrorHandler(handleError);
    try {
      const childNode = children();
      currentNode = childNode;
      // Initial render: markers are in the fragment; after mount: in real DOM.
      // Both are valid Node parents that support insertBefore.
      startMarker.parentNode!.insertBefore(childNode.el, endMarker);
    } catch (e) {
      handleError(e instanceof Error ? e : new Error(String(e)));
    } finally {
      setEffectErrorHandler(prevHandler);
    }
  }

  tryRender();

  return {
    __whisq: true,
    el: fragment,
    disposers: [],
    dispose() {
      disposed = true;
      if (currentNode) {
        currentNode.dispose();
        currentNode = null;
      }
      clearBetweenMarkers();
    },
  };
}

// ── portal() — Render outside parent ───────────────────────────────────────

/**
 * Render content into a different DOM target, escaping the logical parent's
 * overflow/z-index context. Useful for modals, tooltips, and dropdowns.
 *
 * ```ts
 * portal(document.body, div({ class: "modal-overlay" }, "Hello"))
 * ```
 */
export function portal(target: Element, content: WhisqNode): WhisqNode {
  const marker = document.createComment("whisq-portal");

  // Teleport content to target
  target.appendChild(content.el);

  return {
    __whisq: true,
    el: marker,
    disposers: [],
    dispose() {
      content.dispose();
      // Remove teleported content from target
      if (content.el.parentNode) {
        content.el.parentNode.removeChild(content.el);
      }
    },
  };
}

// ── transition() — Enter/exit animations ───────────────────────────────────

interface TransitionAnimConfig {
  duration?: number;
  easing?: string;
  [property: string]:
    | [string | number, string | number]
    | number
    | string
    | undefined;
}

interface TransitionOptions {
  enter?: TransitionAnimConfig;
  exit?: TransitionAnimConfig;
}

/**
 * Add enter/exit animations to an element using the Web Animations API.
 *
 * ```ts
 * transition(div("Hello"), {
 *   enter: { opacity: [0, 1], duration: 300 },
 *   exit: { opacity: [1, 0], duration: 200 },
 * })
 * ```
 */
export function transition(
  node: WhisqNode,
  options: TransitionOptions,
): WhisqNode {
  const el = node.el as HTMLElement;

  // Play enter animation
  if (options.enter && typeof el.animate === "function") {
    const { duration = 300, easing = "ease", ...props } = options.enter;
    const keyframes = buildKeyframes(props);
    el.animate(keyframes, { duration, easing });
  }

  const originalDispose = node.dispose.bind(node);

  return {
    __whisq: true,
    el: node.el,
    disposers: node.disposers,
    dispose() {
      if (options.exit && typeof el.animate === "function") {
        const { duration = 300, easing = "ease", ...props } = options.exit;
        const keyframes = buildKeyframes(props);
        const anim = el.animate(keyframes, { duration, easing });
        anim.finished.then(() => {
          originalDispose();
          if (el.parentNode) el.parentNode.removeChild(el);
        });
      } else {
        originalDispose();
      }
    },
  };
}

function buildKeyframes(
  props: Record<
    string,
    [string | number, string | number] | number | string | undefined
  >,
): Record<string, string | number>[] {
  const from: Record<string, string | number> = {};
  const to: Record<string, string | number> = {};

  for (const [key, value] of Object.entries(props)) {
    if (Array.isArray(value) && value.length === 2) {
      from[key] = value[0];
      to[key] = value[1];
    }
  }

  return [from, to];
}

// ── mount() ─────────────────────────────────────────────────────────────────

/**
 * Mount a WhisqNode into a DOM container.
 *
 * ```ts
 * mount(App({}), document.getElementById("app"));
 * ```
 */
export function mount(node: WhisqNode, container: Element): () => void {
  container.textContent = "";
  container.appendChild(node.el);
  return () => {
    node.dispose();
    container.textContent = "";
  };
}

// ── Internal ────────────────────────────────────────────────────────────────

function applyProp(el: Element, key: string, value: unknown): void {
  if (key === "class") {
    if (value == null || value === false) {
      el.removeAttribute("class");
    } else {
      el.setAttribute("class", String(value));
    }
  } else if (key === "style" && typeof value === "string") {
    (el as HTMLElement).style.cssText = value;
  } else if (key === "value" && "value" in el) {
    (el as HTMLInputElement).value = String(value ?? "");
  } else if (key === "checked" && "checked" in el) {
    (el as HTMLInputElement).checked = Boolean(value);
  } else if (key === "disabled" && "disabled" in el) {
    (el as HTMLInputElement).disabled = Boolean(value);
  } else if (key === "hidden") {
    (el as HTMLElement).hidden = Boolean(value);
  } else if (value === false || value == null) {
    el.removeAttribute(key);
  } else if (value === true) {
    el.setAttribute(key, "");
  } else {
    el.setAttribute(key, String(value));
  }
}

function appendChildren(
  parent: Element,
  child: Child,
  disposers: (() => void)[],
): void {
  if (child == null || child === false || child === true) {
    return;
  }

  if (typeof child === "string" || typeof child === "number") {
    parent.appendChild(document.createTextNode(String(child)));
    return;
  }

  if (child instanceof Node) {
    parent.appendChild(child);
    return;
  }

  if (Array.isArray(child)) {
    for (const c of child) {
      appendChildren(parent, c, disposers);
    }
    return;
  }

  if (typeof child === "object" && "__whisq" in child) {
    parent.appendChild(child.el);
    disposers.push(() => child.dispose());
    return;
  }

  if (typeof child === "function") {
    // Reactive child: () => value
    const marker = document.createComment("whisq");
    parent.appendChild(marker);
    let currentNodes: Node[] = [];

    const dispose = effect(() => {
      const result = (child as () => Child | Child[])();

      // Remove previous nodes
      for (const node of currentNodes) {
        node.parentNode?.removeChild(node);
      }
      currentNodes = [];

      // Render new result
      const fragment = document.createDocumentFragment();
      renderChild(fragment, result, disposers, currentNodes);

      marker.parentNode?.insertBefore(fragment, marker);
    });

    disposers.push(dispose);
    return;
  }
}

function renderChild(
  parent: Node,
  child: Child | Child[],
  disposers: (() => void)[],
  tracker: Node[],
): void {
  if (child == null || child === false || child === true) return;

  if (typeof child === "string" || typeof child === "number") {
    const node = document.createTextNode(String(child));
    parent.appendChild(node);
    tracker.push(node);
    return;
  }

  if (child instanceof Node) {
    parent.appendChild(child);
    tracker.push(child);
    return;
  }

  if (Array.isArray(child)) {
    for (const c of child) {
      renderChild(parent, c, disposers, tracker);
    }
    return;
  }

  if (typeof child === "object" && "__whisq" in child) {
    parent.appendChild(child.el);
    tracker.push(child.el);
    disposers.push(() => child.dispose());
    return;
  }
}
