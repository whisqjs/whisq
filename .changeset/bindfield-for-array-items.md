---
"@whisq/core": minor
"create-whisq": patch
---

Add `bindField(source, item, key, opts?)` — two-way binding for a field on an item inside a signal-held array. Closes the ergonomic gap `bind()` didn't reach: the most common UI shape in real applications (todos, carts, forms-with-rows, CRUD grids).

```ts
each(() => todos.value, (todo) =>
  input({
    type: "checkbox",
    ...bindField(todos, todo, "done", { as: "checkbox" }),
  }),
  { key: (t) => t.id },
)
```

Mirrors `bind()`'s discriminator shapes (text / number / checkbox / radio). `keyBy` identifies which item to rewrite — defaults to `t => t.id`; override for items keyed on something else. Writes produce an immutable array update so downstream `computed` / `effect` re-run correctly.

All four scaffolded templates' `CLAUDE.md` reactive-shapes tables now lead with `bindField()` for this case instead of the manual event pair. The decision flow also updates to *"single signal you own → `bind()`; field inside an item inside a signal-held array → `bindField()`."*

`@whisq/core` size budget raised from 5 KB to 5.5 KB gzipped (current: 5.08 KB). The README updates "Under 5 KB gzipped" → "~5 KB gzipped" to match. `bindField` is exported from the top-level `@whisq/core` so LLMs and autocompletion discover it alongside `bind()`.

Closes #78.
