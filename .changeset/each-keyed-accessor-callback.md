---
"@whisq/core": minor
"create-whisq": minor
---

**Breaking change to keyed `each()` render callbacks.** (In alpha pre-mode this still lands as an `alpha.N → alpha.N+1` bump.)

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
