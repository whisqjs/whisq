# @whisq/core

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
