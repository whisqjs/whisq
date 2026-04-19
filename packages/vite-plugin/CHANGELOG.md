# @whisq/vite-plugin

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
