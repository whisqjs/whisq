---
"@whisq/core": minor
---

Keyed `each()`'s render callback now receives a **hybrid accessor** — callable (`todo()`) **and** signal-shaped (`todo.value`, `todo.peek()`). Joins the uniform `() => sig.value` reactive-access rule that holds everywhere else in the API; closes the last pocket of divergence both reviewers flagged in alpha.7 feedback.

```ts
each(() => todos.value, (todo) =>
  li(
    { class: () => todo.value.done ? "done" : "" },   // new canonical shape
    span(() => todo.value.text),
    button({ onclick: () => remove(todo.value.id) }, "✕"),
  ),
  { key: (t) => t.id },
)
```

**Non-breaking.** The accessor is still a plain function at call sites that want `todo()`, and structurally assignable to `() => T` — so `bindField(todos, todo, "done", { as: "checkbox" })` and every other helper that types its input as `() => T` works unchanged. Existing call sites do not need to migrate; new code should prefer `todo.value.<field>` for consistency with the rest of the reactive-access rule.

`index` follows the same pattern — `index()` (legacy) and `index.value` / `index.peek()` (new) both work.

New exported type: `ItemAccessor<T>` (from `@whisq/core`).

Addresses WHISQ-96 with the hybrid approach — option A's `.value` shape without the breaking-change downside. Partially closes the issue; the docs-side cookbook in `whisq.dev#108` (D-1) should adopt the `.value` shape as the canonical example going forward.
