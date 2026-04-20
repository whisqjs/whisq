# create-whisq

## 0.1.0-alpha.6

### Minor Changes

- 6978011: **Breaking change to keyed `each()` render callbacks.** (In alpha pre-mode this still lands as an `alpha.N → alpha.N+1` bump.)

  Fixes [#62](https://github.com/whisqjs/whisq/issues/62) — the stale-snapshot problem in keyed `each()` where field reads on an item inside the render callback pointed at the old object reference when the source array was replaced.

  ### What changed

  When `each(..., { key })` is used, the render callback now receives **accessor functions** instead of plain values:

  ```ts
  // Before
  each(
    () => todos.value,
    (todo, index) => li({ class: () => (todo.done ? "done" : "") }, todo.text),
    { key: (t) => t.id },
  );

  // After
  each(
    () => todos.value,
    (todo, index) =>
      li({ class: () => (todo().done ? "done" : "") }, () => todo().text),
    { key: (t) => t.id },
  );
  ```

  `todo()` / `index()` read from per-entry signals the reconciler updates when a same-keyed item is replaced. Wrap them in `() => todo().field` to get a reactive getter that re-runs on source changes; call them as `todo().field` for a one-shot snapshot at render time.

  Non-keyed `each()` (no `options.key`) is **unchanged** — it keeps the `(item: T, index: number) => WhisqNode` signature because it recreates nodes on every source change, so staleness isn't possible there.

  ### Migration

  For every call site that passes `{ key }`, change `item.X` to `item().X` (and `index` to `index()`). TypeScript catches this as a type error — `item` is now `() => T`, so property access on it fails to compile.

  ### Why

  The old behavior required users to re-plumb a reactive lookup inside every keyed callback (`computed(() => todos.value.find(t => t.id === todo.id))`) to get correct field updates. That's the exact shape of code LLMs silently get wrong — plausible-looking output that only breaks on interaction. Shipping accessor-style callbacks aligns with Solid's idiom (which LLMs have strong priors for) and makes the reactive edge observable in the call shape.

  Covered by 6 new tests in `packages/core/src/__tests__/each.test.ts`: field-read reactivity, snapshot read (non-reactive opt-out), index reflow on reorder, event-handler accessor read, and DOM node identity preservation across same-key replacement.

### Patch Changes

- 23f54bf: Document project-structure conventions so AI-generated Whisq code matches the scaffolder templates (WHISQ-71).

  Every scaffolded project's `CLAUDE.md` now includes the full convention: one component per file in `src/components/`, one domain per file in `src/stores/`, `main.ts` is for mounting and nothing else, `src/lib/` is Whisq-free. Anti-patterns are called out explicitly (single-file apps, `src/lib/index.ts` utility soup, default exports, import-time I/O in stores).

  Canonical reference lives in the framework repo at [`packages/core/docs/project-structure.md`](https://github.com/whisqjs/whisq/blob/develop/packages/core/docs/project-structure.md). The CLAUDE.md section links to it for deep detail.

  `@whisq/core` is unchanged — this is template/docs content only.

- b23a0b3: Document the four reactive shapes — getter child, getter prop, `bind()` spread, and manual event pair — inside the `CLAUDE.md` that every scaffolded project ships with. Four-row cheat-sheet table plus the one-line decision flow (_"single signal you own → `bind()`; field inside an item inside a signal-held array → manual event pair"_) so AI coding assistants (Claude Code, Cursor, etc.) have the taxonomy in their context from the first prompt.

  Also explicitly calls out that inside a keyed `each(..., { key })`, the callback's `item` argument is an accessor function — `todo()` not `todo` — so field reads don't go stale after the underlying array is replaced.

  The full canonical taxonomy lives in the framework repo at [`packages/core/docs/reactive-shapes.md`](https://github.com/whisqjs/whisq/blob/develop/packages/core/docs/reactive-shapes.md). The docs-site LLM reference card will port the same content as a follow-up.

  No API change.

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
