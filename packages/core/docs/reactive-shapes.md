# Reactive shapes — the four patterns

Canonical reference for **where** reactive data flows into the UI layer. Pinned here alongside [`batch-semantics.md`](./batch-semantics.md) and [`access-shapes.md`](./access-shapes.md) so the docs site's LLM reference card can port this verbatim.

Every reactive position in the API accepts `() => value` — that wrapper is uniform. What you put inside the wrapper depends on the source ([`access-shapes.md`](./access-shapes.md) enumerates those). What you put the wrapper _at_ is one of the four positions below. Pick the access shape first, then the position shape, then wire the two together.

---

## The four shapes at a glance

| # | Shape                     | Example                                                                            | Use when                                                                                |
| - | ------------------------- | ---------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------- |
| 1 | Getter **child**          | `span(() => count.value)`                                                          | A signal drives inline text or a nested element                                         |
| 2 | Getter **prop**           | `{ class: () => active.value ? "on" : "off" }`                                     | A signal drives an element attribute / style / class                                    |
| 3 | **`bind()`** spread       | `input({ ...bind(email) })`                                                        | Two-way binding one signal into one form input you own                                  |
| 4 | **`bindField()`** spread  | `input({ type: "checkbox", ...bindField(todos, todo, "done", { as: "checkbox" }) })` | A field inside an item inside a signal-backed array (inside keyed `each`)               |

Escape hatch: when `bindField()` doesn't fit (deep paths, custom write logic), fall back to a **manual event pair** — `{ checked: () => todo().done, onchange: e => toggle(todo().id) }`. Same idea, more code.

A one-sentence decision flow:

> _"Is the reactive value a single signal you own? → `bind()`. Is it a field inside an item inside a signal-held array? → `bindField()`."_

---

## Shape 1 — Getter child

```ts
const count = signal(0);

div(
  span(() => count.value), // reactive text
  button({ onclick: () => count.value++ }, "+"),
);
```

- **Syntax:** a function at a child position.
- **What it subscribes to:** whatever the function reads. Re-runs when any of those change.
- **Common mistake:** passing `count.value` (a number) as a child. That renders once as a static snapshot.

## Shape 2 — Getter prop

```ts
div({
  class: () => (active.value ? "on" : "off"),
  hidden: () => !visible.value,
  title: () => `Last updated ${lastEdit.value}`,
});
```

- **Syntax:** a function as a prop value.
- **What it subscribes to:** signals read during evaluation.
- **Works for any prop** — class, style, hidden, title, aria-_, data-_, src, href, value, checked, disabled, …
- **Event handlers are NOT reactive props** — they're plain functions attached once. See shapes 3 and 4 for how reactive _behavior_ on events gets wired.

## Shape 3 — `bind()` spread

```ts
const email = signal("");
const age = signal(0);
const agreed = signal(false);

form(
  { onsubmit: submit },
  input({ type: "email", ...bind(email) }),
  input({ type: "number", ...bind(age, { as: "number" }) }),
  input({ type: "checkbox", ...bind(agreed, { as: "checkbox" }) }),
);
```

- **Syntax:** spread `bind(signal, options?)` into an element's props.
- **What it does:** returns a prop object containing both `value` (or `checked`) as a getter AND the matching event handler that writes back to the signal.
- **Use when:** you own a signal whose _whole_ value maps to one form input.
- **Don't use when:** the "signal" is actually a record inside a reactive array (that's shape 4).

Variants:

- `bind(sig)` — text input / textarea / `<select>`
- `bind(sig, { as: "number" })` — numeric input; parses via `valueAsNumber`
- `bind(sig, { as: "checkbox" })` — binds the `checked` property
- `bind(sig, { as: "radio", value: "admin" })` — binds a radio group member

## Shape 4 — `bindField()` spread (inside keyed `each`)

When the writable is a field on an item inside a signal-backed array, `bind()` doesn't apply — the array is the signal and the field isn't independently addressable. `bindField()` covers this case with the same spread shape as `bind()`, producing an immutable array update on write and surviving keyed-`each` array replacement.

```ts
type Todo = { id: string; text: string; done: boolean };
const todos = signal<Todo[]>([]);

ul(
  each(
    () => todos.value,
    (todo) =>
      li(
        input({
          type: "checkbox",
          ...bindField(todos, todo, "done", { as: "checkbox" }),
        }),
        span(() => todo().text),
      ),
    { key: (t) => t.id },
  ),
);
```

- **`todo` is an accessor** (post WHISQ-62) — call it as `todo()` to read the current item. `bindField()` reads it internally to find the target item at write time.
- **`keyBy` defaults to `t => t.id`** — supply `{ keyBy: (t) => t.uuid }` for items keyed on something else.
- **Writes produce a new array** — `source.value` is replaced with an immutably-updated copy, so downstream `computed` / `effect` / keyed `each()` re-run correctly.

When `bindField()` doesn't fit — deep nested paths, writes that touch multiple fields atomically, or custom logic like optimistic updates — fall back to the manual event pair:

```ts
input({
  type: "checkbox",
  checked: () => todo().done,                      // reactive read via accessor
  onchange: () => toggle(todo().id),               // writer — reads latest id
}),
```

The manual pair is strictly more powerful but also strictly more verbose. Prefer `bindField()` when it applies.

---

## Common mistakes

| Mistake                                                                       | Why it breaks                                                                         | Fix                                                 |
| ----------------------------------------------------------------------------- | ------------------------------------------------------------------------------------- | --------------------------------------------------- |
| `span(count.value)`                                                           | Reads once at render. Not reactive.                                                   | `span(() => count.value)`                           |
| `div({ class: active.value ? "on" : "off" })`                                 | Evaluated once.                                                                       | `div({ class: () => active.value ? "on" : "off" })` |
| `input({ value: email.value, oninput: e => email.value = e.target.value })`   | Works but verbose; risks forgetting both sides.                                       | `input({ ...bind(email) })`                         |
| `each(..., (todo) => li(() => todo.done ? ...))` (closes over a stale `todo`) | `todo` is the accessor — `.done` on a function is `undefined`. TypeScript flags this. | `li(() => todo().done ? ...)`                       |
| `items.value.push(x)`                                                         | In-place mutation doesn't notify.                                                     | `items.value = [...items.value, x]`                 |
| `bind(todo, { as: "checkbox" })` inside keyed `each`                          | `todo` is an accessor, not a signal with `.value`.                                    | `bindField(source, todo, "done", { as: "checkbox" })` (shape 4). |

---

## See also

- [`access-shapes.md`](./access-shapes.md) — **how** you read reactive values (signal, keyed-each accessor, resource field). Paired with this doc.
- [`each()` API reference](../src/elements.ts) — the `{ key }` callback passes accessors (WHISQ-62).
- [`bind()` API reference](../src/bind.ts) — exhaustive options for single-signal inputs.
- [`bindField()` API reference](../src/bindField.ts) — field-in-array-item binding (WHISQ-78).
- [`batch-semantics.md`](./batch-semantics.md) — how `batch()` sequences effect flushes across multiple writes.
