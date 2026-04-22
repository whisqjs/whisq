// ============================================================================
// @whisq/sandbox — mountSandboxed()
//
// Render AI-generated (or otherwise untrusted) Whisq source into a sandboxed
// iframe on the current page. Uses standards-only isolation:
//   - <iframe sandbox="allow-scripts">  (unique origin, no forms / popups /
//     top-nav by default; caller can widen if needed)
//   - Content-Security-Policy meta tag inside the iframe's srcdoc
//   - srcdoc rather than src=  (no network navigation; the iframe is a
//     blank document we write into)
//   - postMessage bridge with __whisq tag filtering so other frames on the
//     page can't spoof messages into the onMessage callback
//
// Sibling to createSandbox() — that primitive evaluates code and returns a
// value; this one mounts UI. They coexist because they solve different
// problems.
// ============================================================================

export interface MountSandboxedOptions {
  /**
   * Source code to run inside the iframe. Evaluated as an ES module. Use the
   * global `window.__whisqPost(msg)` inside the source to send messages back
   * to the parent's `onMessage` callback.
   */
  source: string;

  /**
   * DOM element the iframe is appended to. The iframe replaces nothing —
   * it's appended as a child. Clear the container first if you need that.
   */
  container: HTMLElement;

  /**
   * Import map applied inside the iframe (e.g.
   * `{ "@whisq/core": "https://esm.sh/@whisq/core@latest" }`). Required when
   * the source uses bare specifiers like `import { div } from "@whisq/core"`.
   * Origins listed here are automatically allowed in the default CSP.
   */
  importMap?: Record<string, string>;

  /**
   * Called whenever the iframe posts a `__whisq`-tagged message back to the
   * parent. Use the iframe-side global `window.__whisqPost(msg)` to send.
   */
  onMessage?: (message: unknown) => void;

  /**
   * The `sandbox` attribute value. Default `"allow-scripts"` — unique origin,
   * no forms, no popups, no top-navigation. Widen only if the agent UI
   * legitimately needs one of those capabilities.
   */
  sandboxAttrs?: string;

  /**
   * Extra CSP directives merged into the default policy. Keys are directive
   * names (e.g. `"img-src"`), values are space-separated source lists.
   */
  cspDirectives?: Record<string, string>;
}

export interface MountSandboxedHandle {
  /** The created iframe. Kept for caller introspection (position, size, …). */
  readonly iframe: HTMLIFrameElement;

  /**
   * Send a message from the parent into the iframe. The iframe-side source
   * receives it via a `message` event on `window` with `event.data` being
   * `{ __whisqFromParent: true, payload: msg }`.
   */
  postMessage(message: unknown): void;

  /**
   * Remove the iframe from the DOM and tear down the message bridge.
   * Idempotent — safe to call multiple times.
   */
  dispose(): void;
}

/**
 * Mount AI-generated Whisq source into a sandboxed iframe on the current
 * page. Returns a handle for messaging and teardown.
 *
 * ```ts
 * const handle = mountSandboxed({
 *   source: `
 *     import { div, signal } from "@whisq/core";
 *     const n = signal(0);
 *     setInterval(() => n.value++, 1000);
 *     // mount into the iframe's body
 *     document.body.append(div(() => String(n.value)).el);
 *     window.__whisqPost({ type: "ready" });
 *   `,
 *   container: document.getElementById("agent-output")!,
 *   importMap: { "@whisq/core": "https://esm.sh/@whisq/core@latest" },
 *   onMessage: (msg) => console.log("from sandbox:", msg),
 * });
 *
 * // Later:
 * handle.postMessage({ type: "shutdown" });
 * handle.dispose();
 * ```
 */
export function mountSandboxed(
  options: MountSandboxedOptions,
): MountSandboxedHandle {
  const {
    source,
    container,
    importMap,
    onMessage,
    sandboxAttrs = "allow-scripts",
    cspDirectives,
  } = options;

  const iframe = document.createElement("iframe");
  iframe.setAttribute("sandbox", sandboxAttrs);
  iframe.srcdoc = buildSrcdoc({ source, importMap, cspDirectives });

  let disposed = false;
  const handleMessage = (event: MessageEvent) => {
    if (disposed) return;
    // Cross-talk protection: ignore messages from other frames on the page.
    if (event.source !== iframe.contentWindow) return;
    const data = event.data;
    if (
      data == null ||
      typeof data !== "object" ||
      (data as { __whisq?: unknown }).__whisq !== true
    ) {
      return;
    }
    onMessage?.((data as { payload?: unknown }).payload);
  };
  window.addEventListener("message", handleMessage);

  container.appendChild(iframe);

  return {
    iframe,
    postMessage(message: unknown): void {
      if (disposed) return;
      iframe.contentWindow?.postMessage(
        { __whisqFromParent: true, payload: message },
        "*",
      );
    },
    dispose(): void {
      if (disposed) return;
      disposed = true;
      window.removeEventListener("message", handleMessage);
      if (iframe.parentNode) iframe.parentNode.removeChild(iframe);
    },
  };
}

// ── Internal ───────────────────────────────────────────────────────────────

/**
 * Build the srcdoc HTML with CSP + importmap + user source wrapped in a
 * module script. The source is sanitised against `</script>` escape so a
 * malicious or accidental closer can't break out of the module block and
 * inject raw HTML into the iframe document.
 */
function buildSrcdoc(opts: {
  source: string;
  importMap?: Record<string, string>;
  cspDirectives?: Record<string, string>;
}): string {
  const csp = buildCsp(opts.importMap, opts.cspDirectives);
  const importMapTag =
    opts.importMap && Object.keys(opts.importMap).length > 0
      ? `<script type="importmap">${escapeScriptContent(
          JSON.stringify({ imports: opts.importMap }),
        )}</script>`
      : "";

  const safeSource = escapeScriptContent(opts.source);

  // The parent postMessage bridge + parent-to-iframe message forwarder.
  const harness = `
window.__whisqPost = (msg) => parent.postMessage({ __whisq: true, payload: msg }, "*");
window.addEventListener("message", (e) => {
  const d = e.data;
  if (d && typeof d === "object" && d.__whisqFromParent === true) {
    window.dispatchEvent(new CustomEvent("whisq:parent", { detail: d.payload }));
  }
});
`.trim();

  return `<!doctype html>
<html>
<head>
<meta charset="utf-8">
<meta http-equiv="Content-Security-Policy" content="${escapeAttr(csp)}">
${importMapTag}
</head>
<body>
<script type="module">
${harness}
try {
${safeSource}
} catch (err) {
  const msg = err && err.message ? err.message : String(err);
  parent.postMessage({ __whisq: true, payload: { __whisqError: msg } }, "*");
}
</script>
</body>
</html>`;
}

function buildCsp(
  importMap: Record<string, string> | undefined,
  extra: Record<string, string> | undefined,
): string {
  // Collect origins from the import map so the browser is allowed to fetch
  // remote modules (e.g. https://esm.sh). Each entry's URL contributes its
  // origin — not its path — because CSP source lists match by origin.
  const scriptSrc = new Set<string>(["'unsafe-inline'"]);
  if (importMap) {
    for (const url of Object.values(importMap)) {
      const origin = originOf(url);
      if (origin) scriptSrc.add(origin);
    }
  }

  const defaults: Record<string, string> = {
    "default-src": "'none'",
    "script-src": Array.from(scriptSrc).join(" "),
    "style-src": "'unsafe-inline'",
    "img-src": "data: blob: https:",
    "font-src": "data: https:",
    "connect-src": "https:",
    "base-uri": "'none'",
    "form-action": "'none'",
  };

  const merged = { ...defaults, ...(extra ?? {}) };
  return Object.entries(merged)
    .map(([k, v]) => `${k} ${v}`)
    .join("; ");
}

function originOf(url: string): string | null {
  try {
    const u = new URL(url);
    return u.origin;
  } catch {
    return null;
  }
}

function escapeScriptContent(s: string): string {
  // Prevent `</script>` or HTML comment closers from breaking out of the
  // surrounding <script> block in srcdoc. Replace the case-insensitive
  // closer with a form that looks identical when serialised back to a
  // string inside the script but is NOT parsed as a closing tag by the
  // HTML tokeniser.
  return s
    .replace(/<\/(script)/gi, "<\\/$1")
    .replace(/<!--/g, "<\\!--")
    .replace(/-->/g, "--\\>");
}

function escapeAttr(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/"/g, "&quot;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}
