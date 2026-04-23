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
import { WhisqStructureError, describeValue } from "./dev-errors.js";
import { WHISQ_BIND_SOURCES, type BindSources } from "./bind-sentinel.js";

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

/**
 * An event handler generic over the event type and the element the handler
 * is attached to. The second parameter narrows `event.currentTarget` so
 * `e.currentTarget.value` on an input handler typechecks without casts.
 *
 * Useful for handlers defined outside the element call site, where
 * inference can't kick in:
 *
 * ```ts
 * const onSubmit: EventHandler<SubmitEvent, HTMLFormElement> = (e) => {
 *   e.preventDefault();
 *   e.currentTarget.reset();
 * };
 * form({ onsubmit: onSubmit });
 * ```
 */
export type EventHandler<
  E extends Event = Event,
  T extends Element = Element,
> = (event: E & { currentTarget: T }) => void;

/**
 * Lift a DOM event name (as used in `HTMLElementEventMap`) to its narrowed
 * event type, with `currentTarget` set to the element the handler is on.
 *
 * Useful when you want to name the exact event — more readable than writing
 * `KeyboardEvent & { currentTarget: HTMLInputElement }` by hand:
 *
 * ```ts
 * function onSearchKey(e: WhisqEvent<"keydown", HTMLInputElement>) {
 *   if (e.key === "Enter") submit();
 * }
 * input({ onkeydown: onSearchKey });
 * ```
 */
export type WhisqEvent<
  K extends keyof HTMLElementEventMap,
  T extends Element = Element,
> = HTMLElementEventMap[K] & { currentTarget: T };

type ReactiveProp<T> = T | (() => T);

type StyleValue = string | number | null | undefined;
export type StyleObject = Record<string, StyleValue | (() => StyleValue)>;

/**
 * The accessor passed to a keyed `each()`'s render callback. It is both
 * **callable** (`todo()` returns the current item — backwards-compatible
 * with pre-alpha.8 code) **and** **signal-shaped** (`todo.value`,
 * `todo.peek()`) — new code should prefer `todo.value.<field>` for the
 * uniform reactive-access rule.
 *
 * ```ts
 * // new canonical shape — joins the `() => sig.value` pattern
 * each(() => todos.value, (todo) =>
 *   li(() => todo.value.text),
 *   { key: (t) => t.id },
 * )
 *
 * // still works (call form) — bindField and other `() => T` consumers
 * // continue to accept the accessor without modification
 * each(() => todos.value, (todo) =>
 *   input({ ...bindField(todos, todo, "done", { as: "checkbox" }) }),
 *   { key: (t) => t.id },
 * )
 * ```
 */
export interface ItemAccessor<T> {
  (): T;
  readonly value: T;
  peek(): T;
}

/**
 * A single source inside a `class: [...]` array. Strings become class names;
 * falsy values (`false | null | undefined | 0 | ""`) are filtered out,
 * enabling the `cond && "active"` shorthand; functions are reactive — each
 * function is called during the render effect, so reads inside it track.
 */
export type ClassArraySource =
  | string
  | false
  | null
  | undefined
  | 0
  | ""
  | (() => string | false | null | undefined);

interface BaseProps {
  ref?: Ref;
  class?:
    | ReactiveProp<string | undefined>
    | readonly ClassArraySource[];
  id?: ReactiveProp<string | undefined>;
  style?: ReactiveProp<string | undefined> | StyleObject;
  hidden?: ReactiveProp<boolean>;
  title?: ReactiveProp<string | undefined>;
  [key: `data-${string}`]: ReactiveProp<string | undefined>;
}

// Shared form-control event bundle, generic over the control's element type
// so input/textarea/select each narrow `e.currentTarget` correctly.
interface FormControlEvents<T extends Element> {
  oninput?: EventHandler<InputEvent, T>;
  onchange?: EventHandler<Event, T>;
  onfocus?: EventHandler<FocusEvent, T>;
  onblur?: EventHandler<FocusEvent, T>;
  onkeydown?: EventHandler<KeyboardEvent, T>;
  onkeyup?: EventHandler<KeyboardEvent, T>;
}

interface InputProps extends BaseProps, FormControlEvents<HTMLInputElement> {
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
}

interface TextareaProps
  extends BaseProps, FormControlEvents<HTMLTextAreaElement> {
  value?: ReactiveProp<string>;
  placeholder?: string;
  disabled?: ReactiveProp<boolean>;
  readonly?: ReactiveProp<boolean>;
  name?: string;
  rows?: number;
  cols?: number;
  required?: boolean;
}

interface SelectProps extends BaseProps {
  value?: ReactiveProp<string>;
  disabled?: ReactiveProp<boolean>;
  name?: string;
  onchange?: EventHandler<Event, HTMLSelectElement>;
  oninput?: EventHandler<InputEvent, HTMLSelectElement>;
}

interface CommonProps extends BaseProps {
  onclick?: EventHandler<MouseEvent, HTMLElement>;
  ondblclick?: EventHandler<MouseEvent, HTMLElement>;
  onmouseenter?: EventHandler<MouseEvent, HTMLElement>;
  onmouseleave?: EventHandler<MouseEvent, HTMLElement>;
  onkeydown?: EventHandler<KeyboardEvent, HTMLElement>;
  onsubmit?: EventHandler<SubmitEvent, HTMLElement>;
  onfocus?: EventHandler<FocusEvent, HTMLElement>;
  onblur?: EventHandler<FocusEvent, HTMLElement>;
  role?: string;
  tabindex?: number;
  draggable?: boolean;
}

interface FormProps extends Omit<CommonProps, "onsubmit"> {
  action?: string;
  method?: string;
  enctype?: string;
  novalidate?: boolean;
  onsubmit?: EventHandler<SubmitEvent, HTMLFormElement>;
}

interface AnchorProps extends Omit<CommonProps, "onclick"> {
  href?: ReactiveProp<string>;
  target?: string;
  rel?: string;
  onclick?: EventHandler<MouseEvent, HTMLAnchorElement>;
}

interface ImgProps extends Omit<CommonProps, "onclick"> {
  src?: ReactiveProp<string>;
  alt?: string;
  width?: number | string;
  height?: number | string;
  loading?: "lazy" | "eager";
  onclick?: EventHandler<MouseEvent, HTMLImageElement>;
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

  // Dev-only: detect when a spread of bind()/bindField()/bindPath() was
  // followed by an explicit overwrite of one of its event handlers.
  // See WHISQ-120 + packages/core/src/bind-sentinel.ts for the mechanism
  // (a symbol-keyed manifest carried through object spread).
  if (process.env.NODE_ENV !== "production" && props) {
    checkOverwrittenBindHandlers(tag, props);
  }

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
      if (key === "style" && isPlainStyleObject(value)) {
        // Style object — per-property reactive subscriptions
        applyStyleObject(el as HTMLElement, value, disposers);
        continue;
      }
      if (key === "class" && Array.isArray(value)) {
        // Array form (WHISQ-97): class: ["btn", () => ..., cond && "x"].
        // Reactive if any source is a function; static otherwise. Falsy
        // sources (false / null / undefined / 0 / "") are filtered out.
        const sources = value as readonly ClassArraySource[];
        const hasReactive = sources.some((s) => typeof s === "function");
        if (hasReactive) {
          const dispose = effect(() => {
            applyProp(el, "class", joinClassArray(sources));
          });
          disposers.push(dispose);
        } else {
          applyProp(el, "class", joinClassArray(sources));
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
  props?: TextareaProps | Child,
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
 * **Predicate-chain** conditional renderer — _not_ pattern matching.
 * Evaluates an `if / else-if` chain of `[() => predicate, () => render]` tuples
 * and renders the first whose predicate returns truthy. An optional trailing
 * **bare render function** (not a tuple) is the fallback, rendered only when
 * every predicate is falsy. Returns `null` if no branch matches and no
 * fallback is given. Re-evaluates reactively on any signal read inside the
 * predicates.
 *
 * ```ts
 * div(
 *   match(
 *     [() => users.loading(),    () => p("Loading...")],
 *     [() => !!users.error(),    () => p({ class: "error" }, users.error()!.message)],
 *     [() => !!users.data(),     () => List({ items: users.data()! })],
 *     () => p("No data yet."), // fallback — bare fn, no tuple
 *   ),
 * )
 * ```
 *
 * - **Shape**: every branch is a tuple `[() => boolean, () => WhisqNode | string | null]`.
 *   No object form (e.g. `match({ loading: ..., error: ... })`) — this is a
 *   predicate chain, not a value-dispatch table. For value dispatch, use a
 *   plain getter with a switch: `() => { switch (status.value) { ... } }`.
 * - **First-true-wins**: if two predicates are true, only the earlier branch
 *   renders. Order branches from most specific to least.
 * - **Fallback position**: bare render fn goes _last_. Putting it in the
 *   middle is a bug — in dev mode it throws a `WhisqStructureError`.
 */
export function match(...branches: MatchBranch[]): () => Child;
export function match(...args: [...MatchBranch[], MatchRender]): () => Child;
export function match(...args: Array<MatchBranch | MatchRender>): () => Child {
  if (process.env.NODE_ENV !== "production") {
    for (let i = 0; i < args.length; i++) {
      const arg = args[i];
      const isLast = i === args.length - 1;
      if (Array.isArray(arg)) {
        if (
          arg.length !== 2 ||
          typeof arg[0] !== "function" ||
          typeof arg[1] !== "function"
        ) {
          throw new WhisqStructureError({
            element: "match",
            expected: "a branch tuple `[() => boolean, () => WhisqNode]`",
            received: describeValue(arg),
            hint: "Each branch must be a two-element tuple of functions. If you were reaching for pattern matching on a value, use `() => { switch (value.value) { ... } }` inside a getter child instead.",
          });
        }
      } else if (typeof arg === "function") {
        if (!isLast) {
          throw new WhisqStructureError({
            element: "match",
            expected: "fallback render (bare function) to be the last argument",
            received: `fallback at position ${i} of ${args.length}`,
            hint: "Only one fallback is allowed, and it must come after every tuple branch. Reorder so the bare render function is last.",
          });
        }
      } else {
        throw new WhisqStructureError({
          element: "match",
          expected: "a branch tuple or a trailing fallback render function",
          received: describeValue(arg),
          hint:
            typeof arg === "object" && arg !== null
              ? "`match()` is a predicate chain, not a value-dispatch table. Plain objects like `{ loading: ..., error: ... }` aren't accepted — write tuples: `[() => state.value === 'loading', () => ...]`."
              : "Each argument must be `[() => boolean, () => WhisqNode]` or (in the last position) a bare `() => WhisqNode` fallback.",
        });
      }
    }
  }

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
): () => Child[];
export function each<T>(
  items: () => T[],
  render: (
    item: ItemAccessor<T>,
    index: ItemAccessor<number>,
  ) => WhisqNode,
  options: { key: (item: T) => unknown },
): WhisqNode;
export function each<T>(
  items: () => T[],
  render:
    | ((item: T, index: number) => WhisqNode)
    | ((
        item: ItemAccessor<T>,
        index: ItemAccessor<number>,
      ) => WhisqNode),
  options?: { key: (item: T) => unknown },
): (() => Child[]) | WhisqNode {
  if (process.env.NODE_ENV !== "production") {
    if (typeof items !== "function") {
      throw new WhisqStructureError({
        element: "each",
        expected: "items to be a function `() => T[]`",
        received: describeValue(items),
        hint: "Pass a getter, not the array itself: `each(() => todos.value, ...)` not `each(todos.value, ...)`.",
      });
    }
    if (typeof render !== "function") {
      throw new WhisqStructureError({
        element: "each",
        expected: "render to be a function",
        received: describeValue(render),
      });
    }
  }

  const getItems = (): T[] => {
    const result = items();
    if (process.env.NODE_ENV !== "production" && !Array.isArray(result)) {
      throw new WhisqStructureError({
        element: "each",
        expected: "items() to return an array",
        received: describeValue(result),
        hint:
          result == null
            ? "Data hasn't loaded yet. Gate the list with `when(() => data(), () => ul(each(...)))` or return `[]` while loading."
            : "Return an array from the items getter — objects and maps need to be converted first (e.g. `Object.values(users.value)`).",
      });
    }
    return result;
  };

  if (!options?.key) {
    // Non-keyed: simple map — items are snapshots per render, no staleness
    // issue because nodes are recreated on every source change.
    const renderSnapshot = render as (item: T, index: number) => WhisqNode;
    return () => getItems().map((item, i) => renderSnapshot(item, i));
  }

  // Keyed: return a WhisqNode that manages its own reconciliation.
  // The render function receives accessors (() => T, () => number) so
  // reactive getters over item fields see fresh values when the source
  // array is replaced with new items at the same key (WHISQ-62).
  const keyFn = options.key;
  const renderAccessor = render as (
    item: ItemAccessor<T>,
    index: ItemAccessor<number>,
  ) => WhisqNode;
  const marker = document.createComment("whisq-each");
  const disposers: (() => void)[] = [];
  let entries: KeyedEntry<T>[] = [];

  // We need a parent — create a fragment to hold the marker initially.
  // The marker will be reparented when appended to the actual DOM.
  const fragment = document.createDocumentFragment();
  fragment.appendChild(marker);

  const dispose = effect(() => {
    const newItems = getItems();
    const parent = marker.parentNode;
    if (!parent) return;

    entries = reconcileKeyed(
      parent,
      marker,
      entries,
      newItems,
      keyFn,
      renderAccessor,
    );
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

function isPlainStyleObject(value: unknown): value is StyleObject {
  if (typeof value !== "object" || value === null || Array.isArray(value)) {
    return false;
  }
  const proto = Object.getPrototypeOf(value);
  return proto === Object.prototype || proto === null;
}

function checkOverwrittenBindHandlers(
  tag: string,
  props: Record<string, unknown>,
): void {
  // The sentinel is a non-enumerable property under a symbol key; a plain
  // `in` check hits it without polluting any Object.entries iteration.
  const sources = (props as { [k: symbol]: unknown })[WHISQ_BIND_SOURCES] as
    | BindSources
    | undefined;
  if (!sources) return;
  for (const key of Object.keys(sources)) {
    const declared = sources[key];
    const current = (props as Record<string, unknown>)[key];
    if (current !== declared) {
      // eslint-disable-next-line no-console
      console.warn(
        `[whisq] duplicate handler for "${key}" on <${tag}>: ` +
          `the handler returned by bind()/bindField()/bindPath() was overwritten. ` +
          `JS object spread is last-key-wins — your explicit "${key}" silently dropped the bind handler. ` +
          `To keep both, chain them manually: ` +
          `{ ...bind(sig), ${key}: (e) => { /* your code */ /* then call bind's handler yourself */ } }, ` +
          `or spread bind LAST so your handler is the one that gets wiped (usually the bug you want).`,
      );
    }
  }
}

function joinClassArray(sources: readonly ClassArraySource[]): string {
  const parts: string[] = [];
  for (const src of sources) {
    if (!src) continue; // filters false / null / undefined / 0 / ""
    if (typeof src === "string") {
      parts.push(src);
    } else if (typeof src === "function") {
      const result = src();
      if (result) parts.push(result);
    }
  }
  return parts.join(" ");
}

function camelToKebab(str: string): string {
  return str.replace(/[A-Z]/g, (m) => `-${m.toLowerCase()}`);
}

function applyStyleObject(
  el: HTMLElement,
  style: StyleObject,
  disposers: (() => void)[],
): void {
  for (const [prop, raw] of Object.entries(style)) {
    const cssProp = prop.startsWith("--") ? prop : camelToKebab(prop);
    if (typeof raw === "function") {
      const getter = raw as () => StyleValue;
      const dispose = effect(() => {
        const v = getter();
        if (v == null || v === "") {
          el.style.removeProperty(cssProp);
        } else {
          el.style.setProperty(cssProp, String(v));
        }
      });
      disposers.push(dispose);
    } else if (raw != null && raw !== "") {
      el.style.setProperty(cssProp, String(raw));
    }
  }
}

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

  if (process.env.NODE_ENV !== "production") {
    throw new WhisqStructureError({
      element: (parent as Element).tagName?.toLowerCase() ?? "element",
      expected:
        "WhisqNode | string | number | boolean | null | undefined | function | array",
      received: describeValue(child),
      hint:
        typeof child === "object" && !Array.isArray(child)
          ? "Plain objects can't be rendered as children. Did you forget to call a component (`MyComponent({})` not `MyComponent`), or wrap a signal read in `() => signal.value`?"
          : undefined,
    });
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

  if (process.env.NODE_ENV !== "production") {
    throw new WhisqStructureError({
      element: (parent as Element).nodeName?.toLowerCase() ?? "element",
      expected:
        "WhisqNode | string | number | boolean | null | undefined | array",
      received: describeValue(child),
      hint:
        typeof child === "function"
          ? "A reactive child `() => value` returned another function. Did you wrap a getter twice (`() => () => sig.value`)?"
          : "Plain objects can't be rendered. If this came from a signal, wrap the read in `() => ...`; if it's a component, call it: `MyComponent({})`.",
    });
  }
}
