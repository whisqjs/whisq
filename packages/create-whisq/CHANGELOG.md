# create-whisq

## 0.1.0-alpha.9

## 0.1.0-alpha.8

### Minor Changes

- e3134ac: `full-app` template now scaffolds the canonical multi-file shape that the project-structure docs describe:
  - **`src/components/`** — `CounterRow.ts` demonstrates the pattern for reusable UI pulled out of a page.
  - **`src/lib/`** — `format.ts` demonstrates a pure utility module (no `@whisq/*` imports), including `formatCount()` and `clamp()` used by the scaffolded `CounterRow`.
  - **`src/App.ts`** — now wraps `RouterView` in `errorBoundary`, so a thrown error in any page degrades to a retry UI instead of tearing down the whole app. Demonstrates the canonical error-boundary shape `App.ts` should own.
  - **`src/pages/Home.ts`** — rewritten to consume `CounterRow` + `clamp`, connecting all four directories (`pages/` → `components/` → `lib/`) in one working example.

  Closes the framework-side half of WHISQ-102. A whisq.dev companion page (`/examples/canonical-app-structure/`) is tracked for a follow-up PR.

  Existing `full-app` behavior (router, stores/, styles.ts, pages/About.ts) is unchanged.

## 0.1.0-alpha.7

### Patch Changes

- 35c30c1: Document the three reactive **access shapes** — signal `.value`, keyed-`each` item accessor `()`, `resource()` field `()` — honestly, without papering over the fact that the uniform-`() => value` claim describes the _wrapper_ but not what goes inside it. New canonical framework doc at [`packages/core/docs/access-shapes.md`](https://github.com/whisqjs/whisq/blob/develop/packages/core/docs/access-shapes.md).

  Each scaffolded project's `CLAUDE.md` now carries a three-row table and a link to the canonical doc so AI coding assistants don't have to re-derive the rule from scratch on every prompt.

  Collateral updates:
  - `packages/core/docs/reactive-shapes.md` now cross-links to `access-shapes.md`, drops the "uniform framing undersells" opener (access-shapes.md owns that framing now), and updates shape #4 from "manual event pair" to `bindField()` (shipped in WHISQ-78) with the manual pair demoted to escape-hatch status.
  - Repo README bullet tightened from "uniform `() => value` reactive pattern" to "one reactive wrapper" with a link to the three read shapes.

  Closes #79. `@whisq/core` runtime unchanged — pure docs/positioning work.

- b278f60: Document **accessors across component boundaries** — the silent-staleness bug that alpha.6 feedback called the single most uncertain moment in building a todo app.

  [`packages/core/docs/access-shapes.md`](https://github.com/whisqjs/whisq/blob/develop/packages/core/docs/access-shapes.md) gains a full "Accessors across component boundaries" section with:
  - A worked parent + child example where the child takes `{ todo: () => Todo }` and reads `props.todo()` inside getters.
  - A counter-example showing the exact snapshot-at-setup pattern that silently breaks (row renders, never updates, stale `.id` after reorder).
  - A variant table mapping parent source type (`Signal<T>`, keyed-`each` accessor, `resource()` field) to prop shapes and child read patterns.
  - A mistakes table naming the four most common footguns (calling the accessor at the parent, snapshotting inside child setup, destructuring props, passing `.value[0]`).

  All four scaffolded `CLAUDE.md` files gain the short version inline — parent + child skeleton + the "don't snapshot" rule — with a link to the canonical doc for depth.

  Closes #80. Runtime-warning AC deferred to a P3 follow-up — static analysis (eslint / tsc) is a better fit than runtime instrumentation once real usage demands detection.

- 757049d: Add `bindField(source, item, key, opts?)` — two-way binding for a field on an item inside a signal-held array. Closes the ergonomic gap `bind()` didn't reach: the most common UI shape in real applications (todos, carts, forms-with-rows, CRUD grids).

  ```ts
  each(
    () => todos.value,
    (todo) =>
      input({
        type: "checkbox",
        ...bindField(todos, todo, "done", { as: "checkbox" }),
      }),
    { key: (t) => t.id },
  );
  ```

  Mirrors `bind()`'s discriminator shapes (text / number / checkbox / radio). `keyBy` identifies which item to rewrite — defaults to `t => t.id`; override for items keyed on something else. Writes produce an immutable array update so downstream `computed` / `effect` re-run correctly.

  All four scaffolded templates' `CLAUDE.md` reactive-shapes tables now lead with `bindField()` for this case instead of the manual event pair. The decision flow also updates to _"single signal you own → `bind()`; field inside an item inside a signal-held array → `bindField()`."_

  `@whisq/core` size budget raised from 5 KB to 5.5 KB gzipped (current: 5.08 KB). The README updates "Under 5 KB gzipped" → "~5 KB gzipped" to match. `bindField` is exported from the top-level `@whisq/core` so LLMs and autocompletion discover it alongside `bind()`.

  Closes #78.

- 34a2c7a: Add `bindPath(source, path, opts?)` — two-way binding for a field at an arbitrary **object path** in a signal-held record. Use when `bind()` doesn't apply because the field lives two or more levels deep (e.g. `user.profile.email`, `settings.billing.plan`). Follow-up to WHISQ-78 (`bindField`) for the nested-object case the feedback docs flagged as friction against the flat-binding primitives.

  Exported from a new sub-path, `@whisq/core/forms`, so apps that only need `bind()` + `bindField()` (the 80% case) pay no bundle cost. Top-level `@whisq/core` stays at 5.25 KB gzipped.

  ```ts
  import { bindPath } from "@whisq/core/forms";

  form(
    input({ ...bindPath(user, ["profile", "name"]) }),
    input({ type: "email", ...bindPath(user, ["profile", "email"]) }),
    input({
      type: "number",
      ...bindPath(user, ["profile", "age"], { as: "number" }),
    }),
    input({
      type: "checkbox",
      ...bindPath(user, ["prefs", "dark"], { as: "checkbox" }),
    }),
  );
  ```

  ### Behaviors worth leading with
  - **Structural sharing on writes.** Writes produce a new root and new objects at every level on the path; sibling branches keep their reference identity so downstream `computed` / `effect` re-runs stay narrow.
  - **Missing-intermediate creation.** Reading through a missing intermediate returns `undefined`; writing creates the object structure as needed.
  - **Object keys only.** Array traversal is not supported in the path — use `bindField()` at the array level and compose. This keeps `bindPath` predictable and its implementation small.
  - **Typed overloads** for depths 1–4; deeper paths work via the loose signature (same runtime, just less TS inference).

  Mirrors `bind()` and `bindField()`'s discriminator shapes — text / number / checkbox / radio.

  Scaffolded `CLAUDE.md` files gain a "Binding into nested records (opt-in, sub-path import)" block under Forms so AI-generated code for new projects discovers the pattern without reinventing it.

  Closes #86.

- 3a31d18: Clarify `match()` as a **predicate chain, not pattern matching**.

  Audit finding: `match()` has always had exactly one shape — variadic tuple branches `[predicate, render]` with an optional trailing bare render fn as fallback. The GPT-side alpha.6 feedback flagged "object vs tuple form" confusion, but no object form exists in the code; GPT was pattern-matching against Rust/Scala/Vue conventions where `match(value, { case1, case2 })` is common.

  Changes:
  - **JSDoc** now leads with _"Predicate-chain conditional renderer — not pattern matching"_ and calls out the canonical shape, first-true-wins ordering, and fallback-position rules explicitly.
  - **Dev-mode validation** (stripped in production builds) throws a `WhisqStructureError` when `match()` receives a plain object (the exact GPT-style confusion), a malformed tuple, or a fallback that isn't in the last position. Production bundle unchanged at 5.25 KB gzipped.
  - **Scaffolded templates** — all four `CLAUDE.md` files now include `match` in the canonical imports line and expand the "Conditional Rendering" section to document `when()` vs `match()` with a ready example. AI-generated code for new projects will reach for `match` instead of nesting `when()`.

  Closes #83.

- c84e495: Add `persistedSignal(key, initial, opts?)` — a `Signal<T>` backed by `localStorage` / `sessionStorage`, exported from the new sub-path `@whisq/core/persistence` so apps that don't need it pay zero bundle cost.

  ```ts
  import { persistedSignal } from "@whisq/core/persistence";

  export const todos = persistedSignal<Todo[]>("todos", []);
  ```

  Closes the "every Whisq app reinvents the guarded-localStorage-read-with-effect-writer pattern" problem identified by the alpha.6 feedback. Blessed shape, one import, no hand-rolling.

  ### Behaviors worth leading with
  - **SSR-safe.** On the server (`typeof window === "undefined"`) returns a plain signal initialized to `initial` with no storage subscription.
  - **Schema-validated.** If the stored JSON is malformed, or an optional `schema(raw)` validator throws, the signal falls back to `initial` rather than crashing at mount.
  - **Quota-safe.** If a write throws (`QuotaExceededError`, private mode), logs a warning and keeps the in-memory value — the app keeps working.
  - **Module-scope intent.** Call `persistedSignal` at module scope in your `stores/` file, not inside components — the write effect lives for the module lifetime by design.

  Options: `storage: "local" | "session"`, `serialize` / `deserialize` (default JSON), `schema` (validation on load).

  Scaffolded templates' `CLAUDE.md` files gain a "Persisted stores (opt-in, sub-path import)" block under Shared State so AI-generated code for new projects can discover the pattern without reinventing it.

  Closes #82.

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
