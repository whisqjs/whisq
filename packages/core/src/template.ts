// ============================================================================
// Whisq Core — Template Engine
// Tagged template literal rendering with fine-grained reactive DOM updates.
// Key design: ALL dynamic values accessed via getter functions () => value
// This is the "uniform value access" pattern that eliminates AI generation errors.
// ============================================================================

import { effect } from "./reactive.js";

type Binding = {
  type: "text" | "attribute" | "event" | "property";
  node: Node | Element;
  key?: string;
  expression: (() => unknown) | unknown;
};

export type WhisqTemplate = {
  __whisq: true;
  fragment: DocumentFragment;
  bindings: Binding[];
  dispose: () => void;
};

/**
 * Create a reactive template using tagged template literals.
 * Dynamic expressions wrapped in arrow functions are reactive.
 * Static values render once.
 *
 * ```ts
 * const view = html`
 *   <div class="${() => theme.value}">
 *     <h1>${() => title.value}</h1>
 *     <button @click="${() => count.value++}">
 *       Count: ${() => count.value}
 *     </button>
 *   </div>
 * `;
 * ```
 */
export function html(
  strings: TemplateStringsArray,
  ...expressions: unknown[]
): WhisqTemplate {
  const bindings: Binding[] = [];
  const disposers: (() => void)[] = [];

  // Build HTML string with placeholders
  let htmlStr = "";
  for (let i = 0; i < strings.length; i++) {
    htmlStr += strings[i];
    if (i < expressions.length) {
      if (isEventBinding(strings[i])) {
        // Event: @click="${handler}" → data-whisq-event-{idx}
        htmlStr += `"__whisq_event_${i}__"`;
      } else if (isAttributeBinding(strings[i])) {
        // Attribute: class="${() => val}" → placeholder
        htmlStr += `__whisq_attr_${i}__`;
      } else {
        // Text: ${() => val} → comment placeholder
        htmlStr += `<!--whisq:${i}-->`;
      }
    }
  }

  // Parse HTML into DOM
  const template = document.createElement("template");
  template.innerHTML = htmlStr.trim();
  const fragment = template.content.cloneNode(true) as DocumentFragment;

  // Walk the DOM tree and bind expressions
  walkTree(fragment, expressions, bindings, disposers);

  return {
    __whisq: true,
    fragment,
    bindings,
    dispose() {
      for (const d of disposers) d();
    },
  };
}

// ── Mount ───────────────────────────────────────────────────────────────────

/**
 * Mount a template into a DOM container.
 *
 * ```ts
 * mount(html`<h1>Hello Whisq</h1>`, document.getElementById("app"));
 * ```
 */
export function mount(
  templateOrFn: WhisqTemplate | (() => WhisqTemplate),
  container: Element,
): () => void {
  container.textContent = "";

  if (typeof templateOrFn === "function") {
    let currentTemplate: WhisqTemplate | null = null;

    const dispose = effect(() => {
      if (currentTemplate) {
        currentTemplate.dispose();
        container.textContent = "";
      }
      currentTemplate = templateOrFn();
      container.appendChild(currentTemplate.fragment);
    });

    return () => {
      dispose();
      if (currentTemplate) currentTemplate.dispose();
    };
  }

  container.appendChild(templateOrFn.fragment);
  return () => templateOrFn.dispose();
}

// ── Tree Walker ─────────────────────────────────────────────────────────────

function walkTree(
  root: Node,
  expressions: unknown[],
  bindings: Binding[],
  disposers: (() => void)[],
): void {
  const walker = document.createTreeWalker(
    root,
    NodeFilter.SHOW_ELEMENT | NodeFilter.SHOW_COMMENT,
  );

  let node: Node | null = walker.currentNode;
  while (node) {
    if (node.nodeType === Node.COMMENT_NODE) {
      const match = node.textContent?.match(/^whisq:(\d+)$/);
      if (match) {
        const idx = parseInt(match[1], 10);
        const expr = expressions[idx];
        const textNode = document.createTextNode("");
        node.parentNode?.replaceChild(textNode, node);

        if (typeof expr === "function") {
          // Reactive text binding
          const dispose = effect(() => {
            const val = (expr as () => unknown)();
            textNode.textContent = val == null ? "" : String(val);
          });
          disposers.push(dispose);
          bindings.push({ type: "text", node: textNode, expression: expr });
        } else if (isWhisqTemplate(expr)) {
          // Nested template
          const anchor = document.createComment("whisq-child");
          textNode.parentNode?.replaceChild(anchor, textNode);
          anchor.parentNode?.insertBefore(expr.fragment, anchor);
          disposers.push(expr.dispose);
        } else {
          // Static text
          textNode.textContent = expr == null ? "" : String(expr);
          bindings.push({ type: "text", node: textNode, expression: expr });
        }
      }
    } else if (node.nodeType === Node.ELEMENT_NODE) {
      const el = node as Element;
      bindAttributes(el, expressions, bindings, disposers);
    }

    node = walker.nextNode();
  }
}

function bindAttributes(
  el: Element,
  expressions: unknown[],
  bindings: Binding[],
  disposers: (() => void)[],
): void {
  const attrs = Array.from(el.attributes);

  for (const attr of attrs) {
    // Event binding: @click, @input, etc.
    if (attr.name.startsWith("@")) {
      const eventName = attr.name.slice(1);
      const match = attr.value.match(/__whisq_event_(\d+)__/);
      if (match) {
        const idx = parseInt(match[1], 10);
        const handler = expressions[idx];
        if (typeof handler === "function") {
          el.addEventListener(eventName, handler as EventListener);
          disposers.push(() =>
            el.removeEventListener(eventName, handler as EventListener),
          );
          bindings.push({
            type: "event",
            node: el,
            key: eventName,
            expression: handler,
          });
        }
      }
      el.removeAttribute(attr.name);
      continue;
    }

    // Attribute binding
    const match = attr.value.match(/__whisq_attr_(\d+)__/);
    if (match) {
      const idx = parseInt(match[1], 10);
      const expr = expressions[idx];

      if (typeof expr === "function") {
        // Reactive attribute
        const dispose = effect(() => {
          const val = (expr as () => unknown)();
          if (val === false || val == null) {
            el.removeAttribute(attr.name);
          } else if (val === true) {
            el.setAttribute(attr.name, "");
          } else {
            el.setAttribute(attr.name, String(val));
          }
        });
        disposers.push(dispose);
      } else {
        // Static attribute
        if (expr === false || expr == null) {
          el.removeAttribute(attr.name);
        } else {
          el.setAttribute(attr.name, String(expr));
        }
      }

      bindings.push({
        type: "attribute",
        node: el,
        key: attr.name,
        expression: expr,
      });
    }
  }
}

// ── Utilities ───────────────────────────────────────────────────────────────

function isEventBinding(precedingStr: string): boolean {
  // Check if the preceding string ends with @eventname="
  return /\s@[\w-]+=\s*$/.test(precedingStr);
}

function isAttributeBinding(precedingStr: string): boolean {
  // Check if we're inside an attribute value: attr="
  return /\s[\w-]+=["']?\s*$/.test(precedingStr);
}

function isWhisqTemplate(val: unknown): val is WhisqTemplate {
  return (
    val !== null &&
    typeof val === "object" &&
    "__whisq" in val &&
    val.__whisq === true
  );
}
