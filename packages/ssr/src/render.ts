import type { WhisqNode } from "@whisq/core";

// HTML void elements that must not have closing tags
const VOID_ELEMENTS = new Set([
  "area",
  "base",
  "br",
  "col",
  "embed",
  "hr",
  "img",
  "input",
  "link",
  "meta",
  "param",
  "source",
  "track",
  "wbr",
]);

// ── renderToString ─────────────────────────────────────────────────────────

/**
 * Render a WhisqNode to an HTML string for server-side rendering.
 * Reactive values are evaluated once (snapshot at render time).
 * Event handlers are stripped from the output.
 *
 * ```ts
 * const html = renderToString(App({}));
 * ```
 */
export function renderToString(node: WhisqNode): string {
  return serializeNode(node.el);
}

// ── renderToStream ─────────────────────────────────────────────────────────

/**
 * Render a WhisqNode to a ReadableStream for progressive HTML delivery.
 * Sends chunks as each subtree is serialized.
 *
 * ```ts
 * const stream = renderToStream(App({}));
 * // Pipe to HTTP response
 * for await (const chunk of stream) {
 *   res.write(chunk);
 * }
 * res.end();
 * ```
 */
export function renderToStream(node: WhisqNode): ReadableStream<string> {
  return new ReadableStream<string>({
    start(controller) {
      streamNode(node.el, controller);
      controller.close();
    },
  });
}

function streamNode(
  node: Node,
  controller: ReadableStreamDefaultController<string>,
): void {
  if (node.nodeType === 3) {
    controller.enqueue(escapeHtml(node.textContent ?? ""));
    return;
  }

  if (node.nodeType === 8) return;

  if (node.nodeType === 11) {
    for (let i = 0; i < node.childNodes.length; i++) {
      streamNode(node.childNodes[i], controller);
    }
    return;
  }

  if (node.nodeType === 1) {
    const el = node as Element;
    const tag = el.tagName.toLowerCase();
    const attrs = serializeAttributes(el);
    const attrStr = attrs ? " " + attrs : "";

    if (VOID_ELEMENTS.has(tag)) {
      controller.enqueue(`<${tag}${attrStr}>`);
      return;
    }

    controller.enqueue(`<${tag}${attrStr}>`);
    for (let i = 0; i < el.childNodes.length; i++) {
      streamNode(el.childNodes[i], controller);
    }
    controller.enqueue(`</${tag}>`);
  }
}

// ── renderToHydratableString ───────────────────────────────────────────────

/**
 * Render with hydration markers so the client can detect mismatches.
 * Adds data-whisq-h attributes to elements for hydration matching.
 *
 * ```ts
 * const html = renderToHydratableString(App({}));
 * // Client-side: mount(App({}), container) will hydrate existing DOM
 * ```
 */
export function renderToHydratableString(node: WhisqNode): string {
  let counter = 0;
  return serializeNodeHydratable(node.el, () => counter++);
}

function serializeNodeHydratable(node: Node, nextId: () => number): string {
  if (node.nodeType === 3) {
    return escapeHtml(node.textContent ?? "");
  }

  if (node.nodeType === 8) return "";

  if (node.nodeType === 11) {
    let html = "";
    for (let i = 0; i < node.childNodes.length; i++) {
      html += serializeNodeHydratable(node.childNodes[i], nextId);
    }
    return html;
  }

  if (node.nodeType === 1) {
    const el = node as Element;
    const tag = el.tagName.toLowerCase();
    const attrs = serializeAttributes(el);
    const hId = nextId();
    const attrStr = attrs
      ? ` data-whisq-h="${hId}" ${attrs}`
      : ` data-whisq-h="${hId}"`;

    if (VOID_ELEMENTS.has(tag)) {
      return `<${tag}${attrStr}>`;
    }

    let children = "";
    for (let i = 0; i < el.childNodes.length; i++) {
      children += serializeNodeHydratable(el.childNodes[i], nextId);
    }
    return `<${tag}${attrStr}>${children}</${tag}>`;
  }

  return "";
}

// ── collectHead ────────────────────────────────────────────────────────────

export interface HeadData {
  title?: string;
  meta: Array<Record<string, string>>;
  links: Array<Record<string, string>>;
  styles: string[];
}

/**
 * Collect head tags (title, meta, link, style) from the rendered DOM.
 * Call after rendering to extract head data for the HTML shell.
 *
 * ```ts
 * const node = App({});
 * const body = renderToString(node);
 * const head = collectHead();
 *
 * res.send(`
 *   <head>
 *     <title>${head.title}</title>
 *     ${head.meta.map(m => `<meta ${Object.entries(m).map(([k,v]) => `${k}="${v}"`).join(" ")}>`).join("")}
 *     ${head.styles.map(s => `<style>${s}</style>`).join("")}
 *   </head>
 *   <body>${body}</body>
 * `);
 * ```
 */
export function collectHead(): HeadData {
  const head: HeadData = { meta: [], links: [], styles: [] };

  // Collect title
  const titleEl = document.querySelector("title");
  if (titleEl) {
    head.title = titleEl.textContent ?? "";
  }

  // Collect meta tags added by useHead()
  document.querySelectorAll("meta[data-whisq-head]").forEach((el) => {
    const attrs: Record<string, string> = {};
    for (let i = 0; i < el.attributes.length; i++) {
      const a = el.attributes[i];
      if (a.name !== "data-whisq-head") {
        attrs[a.name] = a.value;
      }
    }
    head.meta.push(attrs);
  });

  // Collect link tags added by useHead()
  document.querySelectorAll("link[data-whisq-head]").forEach((el) => {
    const attrs: Record<string, string> = {};
    for (let i = 0; i < el.attributes.length; i++) {
      const a = el.attributes[i];
      if (a.name !== "data-whisq-head") {
        attrs[a.name] = a.value;
      }
    }
    head.links.push(attrs);
  });

  // Collect styles injected by sheet()
  document.querySelectorAll("style[id^='whisq-style-']").forEach((el) => {
    if (el.textContent) {
      head.styles.push(el.textContent);
    }
  });

  return head;
}

// ── renderHeadToString ─────────────────────────────────────────────────────

/**
 * Render collected head data to an HTML string for insertion into <head>.
 *
 * ```ts
 * const headHtml = renderHeadToString(collectHead());
 * ```
 */
export function renderHeadToString(head: HeadData): string {
  const parts: string[] = [];

  if (head.title) {
    parts.push(`<title>${escapeHtml(head.title)}</title>`);
  }

  for (const meta of head.meta) {
    const attrs = Object.entries(meta)
      .map(([k, v]) => `${k}="${escapeAttr(v)}"`)
      .join(" ");
    parts.push(`<meta ${attrs}>`);
  }

  for (const link of head.links) {
    const attrs = Object.entries(link)
      .map(([k, v]) => `${k}="${escapeAttr(v)}"`)
      .join(" ");
    parts.push(`<link ${attrs}>`);
  }

  for (const css of head.styles) {
    parts.push(`<style>${css}</style>`);
  }

  return parts.join("\n");
}

// ── Internal ───────────────────────────────────────────────────────────────

function serializeNode(node: Node): string {
  if (node.nodeType === 3) {
    return escapeHtml(node.textContent ?? "");
  }

  if (node.nodeType === 8) return "";

  if (node.nodeType === 11) {
    return serializeChildren(node);
  }

  if (node.nodeType === 1) {
    const el = node as Element;
    const tag = el.tagName.toLowerCase();
    const attrs = serializeAttributes(el);
    const attrStr = attrs ? " " + attrs : "";

    if (VOID_ELEMENTS.has(tag)) {
      return `<${tag}${attrStr}>`;
    }

    const children = serializeChildren(el);
    return `<${tag}${attrStr}>${children}</${tag}>`;
  }

  return "";
}

function serializeChildren(node: Node): string {
  let html = "";
  for (let i = 0; i < node.childNodes.length; i++) {
    html += serializeNode(node.childNodes[i]);
  }
  return html;
}

function serializeAttributes(el: Element): string {
  const parts: string[] = [];

  for (let i = 0; i < el.attributes.length; i++) {
    const attr = el.attributes[i];
    if (attr.name.startsWith("data-whisq")) continue;
    parts.push(`${attr.name}="${escapeAttr(attr.value)}"`);
  }

  return parts.join(" ");
}

function escapeHtml(str: string): string {
  return str.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

function escapeAttr(str: string): string {
  return str
    .replace(/&/g, "&amp;")
    .replace(/"/g, "&quot;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}
