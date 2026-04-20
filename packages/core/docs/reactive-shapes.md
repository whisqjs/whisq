# Reactive shapes — the four patterns

Canonical reference for the ways reactive data flows into the UI layer. Pinned here alongside [`batch-semantics.md`](./batch-semantics.md) so the docs site's LLM reference card can port this verbatim.

Whisq's marketing thesis is "uniform value access" — every reactive position accepts `() => value`. That's true, but in practice there are **four subtly different shapes** you pick between. The "uniform" framing undersells the decision tree. This doc enumerates them and tells you when to use each.

---

## The four shapes at a glance

| #   | Shape                 | Example                                                            | Use when                                                                  |
| --- | --------------------- | ------------------------------------------------------------------ | ------------------------------------------------------------------------- |
| 1   | Getter **child**      | `span(() => count.value)`                                          | A signal drives inline text or a nested element                           |
| 2   | Getter **prop**       | `{ class: () => active.value ? "on" : "off" }`                     | A signal drives an element attribute / style / class                      |
| 3   | **`bind()`** spread   | `input({ ...bind(email) })`                                        | Two-way binding one signal into one form input you own                    |
| 4   | **Manual event pair** | `{ checked: () => todo().done, onchange: e => toggle(todo().id) }` | A field inside an item inside a signal-backed array (inside keyed `each`) |

A one-sentence decision flow:

> _"Is the reactive value a single signal you own? → `bind()`. Is it a field inside an item inside a signal-held array? → manual pair, reading through the `each` accessor (`todo()`), not a closed-over reference."_

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

## Shape 4 — Manual event pair (inside keyed `each`)

When the thing you want to update lives as a field on an item inside a signal-backed array, `bind()` doesn't apply. The array is the signal; the field isn't independently addressable. Write the reactive read and the writer separately, and go through the `each` accessor to avoid the stale-snapshot trap.

```ts
type Todo = { id: string; text: string; done: boolean };
const todos = signal<Todo[]>([]);

function toggle(id: string) {
  todos.value = todos.value.map((t) =>
    t.id === id ? { ...t, done: !t.done } : t,
  );
}

ul(
  each(
    () => todos.value,
    (todo) =>
      li(
        input({
          type: "checkbox",
          checked: () => todo().done, // reactive read via accessor
          onchange: () => toggle(todo().id), // writer — reads latest id too
        }),
        span(() => todo().text),
        button({ onclick: () => remove(todo().id) }, "✕"),
      ),
    { key: (t) => t.id },
  ),
);
```

- **Key observation:** `todo` is an **accessor function** (post WHISQ-62) — call it as `todo()` to get the current item, and wrap in `() =>` for reactive reads. Closing over `todo` and writing `todo.done` would be stale the moment you replaced the array with new objects at the same key.
- **Why the manual pair and not `bind()`:** `bind()` assumes a single signal with a single writable value. Here the writable is a field on an item; updating it requires re-mapping the whole array.
- **Why not `bind()` on a per-item signal:** you'd have to materialise a signal per field per item. Doable but usually over-engineered for lists that fit in memory.

---

## Common mistakes

| Mistake                                                                       | Why it breaks                                                                         | Fix                                                 |
| ----------------------------------------------------------------------------- | ------------------------------------------------------------------------------------- | --------------------------------------------------- |
| `span(count.value)`                                                           | Reads once at render. Not reactive.                                                   | `span(() => count.value)`                           |
| `div({ class: active.value ? "on" : "off" })`                                 | Evaluated once.                                                                       | `div({ class: () => active.value ? "on" : "off" })` |
| `input({ value: email.value, oninput: e => email.value = e.target.value })`   | Works but verbose; risks forgetting both sides.                                       | `input({ ...bind(email) })`                         |
| `each(..., (todo) => li(() => todo.done ? ...))` (closes over a stale `todo`) | `todo` is the accessor — `.done` on a function is `undefined`. TypeScript flags this. | `li(() => todo().done ? ...)`                       |
| `items.value.push(x)`                                                         | In-place mutation doesn't notify.                                                     | `items.value = [...items.value, x]`                 |
| `bind(todo, { as: "checkbox" })` inside keyed `each`                          | `todo` is an accessor, not a signal with `.value`.                                    | Manual pair (shape 4).                              |

---

## See also

- [`each()` API reference](../src/elements.ts) — the `{ key }` callback now passes accessors (WHISQ-62).
- [`bind()` API reference](../src/bind.ts) — exhaustive options.
- [`batch-semantics.md`](./batch-semantics.md) — how `batch()` sequences effect flushes across multiple writes.
