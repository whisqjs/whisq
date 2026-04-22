# @whisq/core

## 0.1.0-alpha.8

### Minor Changes

- 8f645a8: The `class:` prop on every element now accepts an **array of sources** with per-source reactivity. Strings are class names; falsy values (`false | null | undefined | 0 | ""`) are filtered out — enabling the `cond && "active"` shorthand inline; functions are reactive — each function is called during the render effect and re-reads when its tracked signals change.

  ```ts
  div({
    class: [
      "btn",
      () => `btn-${variant.value}`, // reactive
      loading.value && "btn-loading", // static conditional — cond && "…"
      () => isDisabled.value && "disabled", // reactive conditional
    ],
  });
  ```

  If any array element is a function, the array is applied reactively; otherwise it's applied once at mount. This removes the `cx` vs `rcx` migration footgun Claude's alpha.7 feedback flagged — you no longer have to remember which helper to import when a class prop grows a reactive branch mid-edit.

  `cx` and `rcx` continue to work unchanged — this is a pure addition. A future release may collapse them into a single composition helper (see WHISQ-97 option A) but that change is deferred.

  Closes WHISQ-97 option B. Options A (unified `cx`) and the `rcx` deprecation path remain open on the issue for a follow-up cycle.

- 401bfca: `bindField` now throws a `WhisqKeyByError` on no-match writes in dev mode (default `process.env.NODE_ENV !== "production"`) instead of silently logging to the console. A stale accessor or broken `keyBy` now surfaces immediately at the first click in `vite dev` instead of drowning in the console.

  New option `strict?: boolean` lets callers pin the behaviour explicitly — `strict: true` throws in both envs; `strict: false` keeps the legacy warn-and-discard even in dev. Production behaviour is unchanged (warn-and-discard) unless `strict: true` is set.

  ```ts
  // Default in vite dev: throws WhisqKeyByError
  input({ ...bindField(todos, todo, "done", { as: "checkbox" }) });

  // Opt out if a test deliberately exercises the no-match path:
  input({
    ...bindField(todos, todo, "done", { as: "checkbox", strict: false }),
  });
  ```

  `WhisqKeyByError` carries `sourceKeys`, `targetKey`, and `field` so the error tells you what was in the source at write time vs. what the accessor was looking for. Both the error class and its `WhisqKeyByErrorFields` type are exported from `@whisq/core`.

  Closes WHISQ-100.

- 0c1dccf: Fix `component()` and `sheet()` type signatures so that apps scaffolded from `create-whisq@latest` type-check cleanly under `tsc --strict`.

  Previously, `component()` was typed as `(props) => WhisqTemplate` — a legacy template-literal shape (`{ fragment, bindings, dispose }`) — while every element function (`div`, `span`, etc.) returns `WhisqNode` (`{ el, disposers, dispose, __whisq }`). The two shapes were incompatible, so **every** hyperscript component setup failed `tsc --strict` with _"Type 'WhisqNode' is missing properties: fragment, bindings"_. The runtime check in `component.ts` already required `WhisqNode`-shaped output, so the types were wrong for the documented and actually-supported API.

  Changes:
  - **`component<P>(setup: (props: P) => WhisqNode): ComponentDef<P>`** — setup now returns `WhisqNode`, matching the runtime guard and the hyperscript API that the LLM reference, docs, and starter templates all use. The JSDoc example switches from the legacy `html\`...\`` form to the hyperscript form.
  - **`ComponentDef<P>` call signature** — returns `WhisqNode` so components compose inside elements (`div(MyComponent({}))` now type-checks).
  - **`sheet()` nested selectors** — `StyleRule` is now recursive (`{ [key: string]: StyleValue | StyleRule }`), so mixing base CSS properties and nested rules (`"&:hover": { … }`, `"& a": { "&:hover": { … } }`, `"@media (…)": { … }`) under the same top-level key type-checks. The runtime behaviour is unchanged — the prefix convention is still the source of truth for which keys are nested vs base.

  Breaking: if any code relied on the old `(props) => WhisqTemplate` signature (the tagged-template `html\`...\``path was already rejected by`component()`'s runtime check, so it couldn't actually have been in production use), it needs to return a `WhisqNode` instead.

  Closes WHISQ-108. The `html` tagged-template API and `WhisqTemplate` type remain in `@whisq/core/template` for internal use; fully removing them is tracked as a follow-up to #108.

- 91740a2: Keyed `each()`'s render callback now receives a **hybrid accessor** — callable (`todo()`) **and** signal-shaped (`todo.value`, `todo.peek()`). Joins the uniform `() => sig.value` reactive-access rule that holds everywhere else in the API; closes the last pocket of divergence both reviewers flagged in alpha.7 feedback.

  ```ts
  each(
    () => todos.value,
    (todo) =>
      li(
        { class: () => (todo.value.done ? "done" : "") }, // new canonical shape
        span(() => todo.value.text),
        button({ onclick: () => remove(todo.value.id) }, "✕"),
      ),
    { key: (t) => t.id },
  );
  ```

  **Non-breaking.** The accessor is still a plain function at call sites that want `todo()`, and structurally assignable to `() => T` — so `bindField(todos, todo, "done", { as: "checkbox" })` and every other helper that types its input as `() => T` works unchanged. Existing call sites do not need to migrate; new code should prefer `todo.value.<field>` for consistency with the rest of the reactive-access rule.

  `index` follows the same pattern — `index()` (legacy) and `index.value` / `index.peek()` (new) both work.

  New exported type: `ItemAccessor<T>` (from `@whisq/core`).

  Addresses WHISQ-96 with the hybrid approach — option A's `.value` shape without the breaking-change downside. Partially closes the issue; the docs-side cookbook in `whisq.dev#108` (D-1) should adopt the `.value` shape as the canonical example going forward.

- 2809555: Two opt-in utility helpers, both on sub-path imports so apps that don't use them pay no bundle cost.
  - **`partition(source, predicate)`** from `@whisq/core/collections` — split a signal-held array into two `ReadonlySignal<T[]>` sides (matching / not-matching). Source order is preserved on both sides; each side is an independent `computed()` that only re-runs effects subscribed to it. The canonical use is "active" vs "done" on a todo list without hand-rolling two `computed`s.

    ```ts
    import { partition } from "@whisq/core/collections";

    const todos = signal<Todo[]>([...]);
    const [pending, done] = partition(() => todos.value, (t) => !t.done);
    button({ onclick: () => (todos.value = pending.value) }, "Clear completed");
    ```

  - **`randomId()`** from `@whisq/core/ids` — UUID-v4-shaped random identifier. Uses native `crypto.randomUUID()` when available (all modern browsers, Node 19+, Deno, Bun); falls back to a `Math.random`-based synthesis with the same v4 shape for older targets (old Safari, pre-19 Node). Same output shape on both paths, so callers don't have to branch. Suitable for UI row ids and keyed-`each` keys — **not** for security tokens (the fallback is not cryptographically strong).

    ```ts
    import { randomId } from "@whisq/core/ids";

    const newTodo = { id: randomId(), text, done: false };
    ```

  Top-level `@whisq/core` bundle stays at 5.5 KB gzipped. Closes WHISQ-101.

- 1b669b4: Add `onSchemaFailure?: (err: unknown, raw: string) => void` option to `persistedSignal`. Invoked synchronously **before** fallback to `initial` when `deserialize` throws (malformed stored JSON) or `schema` throws (validator rejects). Receives the thrown error and the exact raw string read from storage — use it to log to Sentry / show a recovery UI / decide between migrate-vs-reset.

  ```ts
  const todos = persistedSignal<Todo[]>("todos", [], {
    schema: validateTodosShape,
    onSchemaFailure: (err, raw) => {
      Sentry.captureException(err, { extra: { key: "todos", raw } });
    },
  });
  ```

  The callback is **not** invoked on first-visit (`raw` would be `null`, not a failure) or on storage-access errors (private mode, disabled storage — environment faults, not schema faults). If the callback itself throws, the exception is caught and logged via `console.warn` so a broken diagnostic pipeline can't prevent signal construction.

  Closes WHISQ-98.

### Patch Changes

- 0afc98b: Fix `theme()` and `sheet()` throwing `ReferenceError: document is not defined` under SSR (server-side rendering). The shared internal `injectCSS()` helper now short-circuits when `typeof document === "undefined"`, matching the SSR-safe pattern that `persistedSignal` already uses.

  User-observable impact:
  - **`theme()`**: SSR call is a no-op (no `<style>` tag is written; client-side hydration takes over on mount). Previously threw.
  - **`sheet()`**: SSR call returns the in-memory classMap (so server-rendered HTML can reference the correct class names for the client to hydrate against), but skips the DOM injection step. Previously threw on the injection line.

  Also clarified `theme()` JSDoc: **"call once at module scope"** and **"duplicate calls = last-call-wins"** are now explicit (the duplicate-calls behavior already held; the docs didn't say so).

  Closes WHISQ-99 (framework side). Docs work on whisq.dev — the `/core-concepts/styling/` and `/api/theme/` pages — will land as a companion PR in that repo.

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
