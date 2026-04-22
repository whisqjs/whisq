# @whisq/core

## 0.1.0-alpha.7

### Minor Changes

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

- 97203c8: Dev-mode runtime errors now tell you what's wrong and how to fix it. `div(...)`, `each()`, and `component()` validate their inputs at the boundary and throw a new `WhisqStructureError` with an expected/received mismatch plus a short hint when malformed children, non-array `each()` items, or invalid component return values show up.

  Where the old behaviors were "`Uncaught TypeError: .for is not iterable`" or a silent drop, you now see:

  ```
  each: expected items() to return an array, received undefined.
  Hint: Data hasn't loaded yet. Gate the list with `when(() => data(), () => ul(each(...)))` or return `[]` while loading.
  ```

  The guard code is wrapped in `if (process.env.NODE_ENV !== "production")` blocks so bundlers (Vite, Rollup, webpack, esbuild) strip it from production bundles — `@whisq/core` size-limit is measured with the same define and stays under budget at 5.25 KB gzipped.

  Public surface: `WhisqStructureError` (class) and `WhisqStructureErrorFields` (type) are both exported so apps can `instanceof`-check and render friendly error boundaries.

  Closes #81.

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

### Patch Changes

- 3a31d18: Clarify `match()` as a **predicate chain, not pattern matching**.

  Audit finding: `match()` has always had exactly one shape — variadic tuple branches `[predicate, render]` with an optional trailing bare render fn as fallback. The GPT-side alpha.6 feedback flagged "object vs tuple form" confusion, but no object form exists in the code; GPT was pattern-matching against Rust/Scala/Vue conventions where `match(value, { case1, case2 })` is common.

  Changes:
  - **JSDoc** now leads with _"Predicate-chain conditional renderer — not pattern matching"_ and calls out the canonical shape, first-true-wins ordering, and fallback-position rules explicitly.
  - **Dev-mode validation** (stripped in production builds) throws a `WhisqStructureError` when `match()` receives a plain object (the exact GPT-style confusion), a malformed tuple, or a fallback that isn't in the last position. Production bundle unchanged at 5.25 KB gzipped.
  - **Scaffolded templates** — all four `CLAUDE.md` files now include `match` in the canonical imports line and expand the "Conditional Rendering" section to document `when()` vs `match()` with a ready example. AI-generated code for new projects will reach for `match` instead of nesting `when()`.

  Closes #83.

## 0.1.0-alpha.6

### Minor Changes

- 4f557c9: Clarify the `ref()` accessor and export a named `ElementRef<T>` type alias (WHISQ-63).

  Addresses the feedback from real app-building: "which accessor on which container-shaped primitive?" The answer for refs has always been `.value` (refs are plain Whisq signals), but the type `Signal<T | null>` surfaced in editor tooltips didn't name the concept, and React's `.current` priors caused a guessing step.

  **Changes:**
  - **New** `ElementRef<T>` type alias exported from `@whisq/core`. Structurally identical to `Signal<T | null>`; the alias exists purely so tooltips read `ElementRef<HTMLInputElement>` and LLMs get a stronger prior for the concept.
  - **`ref<T>()`** now declares its return type as `ElementRef<T>` instead of `Signal<T | null>`. No runtime change.
  - **JSDoc tightened** on both `ref()` and `Ref<T>` to say explicitly: _"read it with `.value`, not `.current`"_.

  **Usage:**

  ```ts
  import { ref } from "@whisq/core";
  import type { ElementRef } from "@whisq/core";

  const inputEl = ref<HTMLInputElement>(); // ElementRef<HTMLInputElement>
  input({ ref: inputEl });
  onMount(() => inputEl.value?.focus()); // .value — not .current

  // Naming a prop / field that holds a ref:
  type FormRefs = {
    email: ElementRef<HTMLInputElement>;
    submitBtn: ElementRef<HTMLButtonElement>;
  };
  ```

  5 new tests in `ref.test.ts` pin: no `.current` property exists, the return value passes `isSignal()`, `subscribe()` fires on mount + unmount, and `ElementRef<T>` is assignable both to the `Ref` prop type and to a `Signal<T | null>` slot.

  Backward compatible. The underlying type is still `Signal<T | null>`; code that declared `Signal<HTMLInputElement | null>` for a ref still works.

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

- ea8d760: Export two type aliases for extracted event handlers (WHISQ-64).
  - `EventHandler<E, T>` — previously internal, now public. Narrows `event.currentTarget` to `T` via intersection.
  - `WhisqEvent<K, T>` — new. Looks up the event type from `HTMLElementEventMap` by name (e.g. `"keydown"`, `"submit"`) and narrows `currentTarget` to `T`. Complementary to `EventHandler`: `WhisqEvent<K, T>` produces the exact event shape you'd otherwise spell out as `KeyboardEvent & { currentTarget: HTMLInputElement }`.

  ```ts
  import type { WhisqEvent, EventHandler } from "@whisq/core";

  // Named extracted handler — event + element in one type parameter.
  function onSearchKey(e: WhisqEvent<"keydown", HTMLInputElement>) {
    if (e.key === "Enter") submit();
  }
  input({ onkeydown: onSearchKey });

  // Or use EventHandler for higher-order handlers.
  const onSubmit: EventHandler<SubmitEvent, HTMLFormElement> = (e) => {
    e.preventDefault();
    e.currentTarget.reset();
  };
  form({ onsubmit: onSubmit });
  ```

  No runtime change. Type-only addition — bundle size unchanged.

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
