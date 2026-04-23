# @whisq/sandbox

## 0.1.0-alpha.9

### Minor Changes

- 308304d: Add `mountSandboxed()` — render AI-generated (or otherwise untrusted) Whisq source into an isolated iframe on the current page. Complements the existing `createSandbox()` primitive (which evaluates code and returns a value) by covering the rendering-isolation use case that ArrowJS's WASM sandbox is known for — without the WASM cost.

  ```ts
  import { mountSandboxed } from "@whisq/sandbox";

  const handle = mountSandboxed({
    source: `
      import { div, signal } from "@whisq/core";
      const n = signal(0);
      setInterval(() => (n.value += 1), 1000);
      document.body.append(div(() => String(n.value)).el);
      window.__whisqPost({ type: "ready" });
    `,
    container: document.getElementById("agent-output")!,
    importMap: { "@whisq/core": "https://esm.sh/@whisq/core@latest" },
    onMessage: (msg) => console.log("from sandbox:", msg),
  });

  handle.postMessage({ type: "shutdown" });
  handle.dispose();
  ```

  Isolation is standards-only:
  - `<iframe sandbox="allow-scripts">` — unique origin; no same-origin access, no forms, no popups, no top-navigation.
  - `<meta http-equiv="Content-Security-Policy">` in the iframe's srcdoc — default policy is `default-src 'none'` with `script-src` allowing inline + origins from your `importMap`; override via `cspDirectives`.
  - `srcdoc` rather than `src=` — no network navigation; the iframe is a blank document we write into.
  - `__whisq`-tagged postMessage bridge — other frames can't spoof messages into the parent's `onMessage` callback. Parent-to-iframe messages arrive as a `whisq:parent` `CustomEvent` on the iframe-side `window`.
  - `</script>` and HTML comment closers inside the user source are escaped to prevent srcdoc injection.

  API shape is deliberately scaffolded so future `isolation: "worker"` / `isolation: "wasm"` backends can land without a breaking change.

  Closes WHISQ-118.

## 0.1.0-alpha.8

## 0.1.0-alpha.7

## 0.1.0-alpha.6

## 0.1.0-alpha.5

### Minor Changes

- 0191d7e: **Retrospective changeset for the batch of work merged since `v0.1.0-alpha.4`.** In pre mode this bumps every package to `0.1.0-alpha.5`.

  ### New `@whisq/core` API
  - **`ref<T>()`** primitive + exported `Ref<T>` type — typed signal refs for DOM elements (#18 · #26)
  - **`bind(signal, options?)`** two-way form-binding helper for `input`/`textarea`/`select` — collapses 3-line controlled-input boilerplate to one spread (#19 · #25)
  - **`resource()` extensions** — `mutate(value | updater)` for optimistic updates, `source` option for reactive refetches, `initialValue`, `keepPrevious`, and an `AbortSignal` passed to the fetcher so requests cancel on refetch/source-change. Stale responses are dropped; AbortErrors don't leak into `.error()` (#20 · #28)
  - **`match(...branches, fallback?)`** multi-branch conditional — first-true-wins renderer in the `when`/`each` family (#21 · #30)
  - **Style prop object form** with per-property reactive subscriptions + new **`sx()`** compositional helper (#22 · #31)
  - **`signalMap<K, V>` / `signalSet<T>`** reactive collections with per-key/per-value tracking, at sub-path `@whisq/core/collections` to keep the top-level bundle under 5 KB (#23 · #32)
  - **Event handler type narrowing** — `e.currentTarget` is now correctly typed per element (`HTMLInputElement`, `HTMLTextAreaElement`, `HTMLSelectElement`, `HTMLFormElement`, `HTMLAnchorElement`, `HTMLImageElement`). New dedicated `TextareaProps` interface (textarea was incorrectly reusing `InputProps`) (#24 · #34)

  ### Tooling
  - **`dist/public-api.json`** manifest shipped inside `@whisq/core` on every build, fetchable via `unpkg.com/@whisq/core@<version>/dist/public-api.json`. Powers the docs-repo drift-check for the AI reference card (#27 · #29)

  ### Notes
  - Backward compatible with `0.1.0-alpha.4`. No breaking changes.
  - Bundle size: `@whisq/core` is **4.75 KB gzipped** (under the 5 KB marketing gate).
  - Test count: 284 in `@whisq/core` (up from ~194 at alpha.4).

## 0.0.1

### Patch Changes

- fa4cd3e: Initial alpha release of all Whisq packages.
  - `@whisq/core` — Reactive signals, hyperscript elements, components, lifecycle, styling
  - `@whisq/router` — Signal-based client-side routing
  - `@whisq/ssr` — Server-side rendering with hydration
  - `@whisq/testing` — Component testing utilities
  - `@whisq/devtools` — Signal inspection and component tree
  - `@whisq/vite-plugin` — File-based routing, HMR, optimized builds
  - `@whisq/mcp-server` — AI tool integration via MCP
  - `@whisq/sandbox` — Sandboxed code execution
  - `create-whisq` — Project scaffolding CLI
