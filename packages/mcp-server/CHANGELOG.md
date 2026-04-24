# @whisq/mcp-server

## 0.1.0-alpha.10

### Minor Changes

- fe295e0: **Spike:** first slice of the enriched `public-api.json` from #103 — ships a drift-validated per-symbol metadata manifest, populates it for the `signals` topic, and wires the MCP server's `signals` docs to consume it.

  ### `@whisq/core`
  - New artefact: `dist/public-api-annotated.json`. Schema spec at `packages/core/docs/api-metadata-schema.md`. Current shape — `{ version, schemaVersion: 1, symbols: SymbolEntry[] }` — is frozen behind `schemaVersion` so consumers can guard against breaking changes.
  - New exports-map entry: `"@whisq/core/public-api-annotated.json"` — the public path consumers import from.
  - Hand-curated source of truth at `packages/core/metadata/api-enrichment.json`. The build step runs `scripts/generate-api-metadata.mjs` after `generate-public-api.mjs` and fails with a non-zero exit if:
    - a `symbols[*].name` is not in `public-api.json` exports (drift),
    - a `seeAlso[*]` reference is not in `public-api.json` exports (drift),
    - any required field on a `SymbolEntry` is missing or wrong type,
    - a duplicate symbol entry appears.
  - Populated for one topic this release: `signals` (`signal`, `computed`, `effect`, `batch`). The names-only `public-api.json` is unchanged — this is a sibling file, not a replacement. See #103 for the path to unification.

  ### `@whisq/mcp-server`
  - New `@whisq/core` workspace dependency (was previously untyped docs; now consumes the annotated manifest).
  - `api-docs.ts` `signals` topic is generated from the enriched manifest at build time — no more hand-written drift. The other topics (`elements`, `components`, `routing`, …) remain hand-written until the schema stabilises; migrating them is a follow-up tracked against #103.
  - Load-bearing phrases consumers grep for (`signal(`, `computed(`, `.value`, `peek()`, `batch(() =>`) are locked in by a new regression test block.

  ### Out of scope (follow-ups)
  - CI drift check between `public-api.json` and `public-api-annotated.json` (all existing exports must have enrichment) — follow-up once the other topics migrate.
  - Migrating the remaining MCP topics — mechanical once this spike's shape is validated across a release cycle.
  - Unifying the two manifests into one — option A in #103; gated on 1–2 releases of stable schema.

  Closes #138.

### Patch Changes

- Updated dependencies [987fde7]
- Updated dependencies [fe295e0]
- Updated dependencies [94caac8]
- Updated dependencies [310dd97]
  - @whisq/core@0.1.0-alpha.10

## 0.1.0-alpha.9

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
