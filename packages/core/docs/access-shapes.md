# Access shapes — the three read patterns

Canonical reference for **how you read** reactive values. Paired with [`reactive-shapes.md`](./reactive-shapes.md), which covers **where** reactive values are consumed (child / prop / `bind()` / `bindField()`). The two docs intersect at every working call site: pick where to put the reactive thing, then pick how to read from its source.

---

## Is "uniform `() => value`" actually uniform?

The marketing line you'll see on whisq.dev is _"wrap reactive reads in `() => ...` everywhere."_ The **wrapper** is uniform — every reactive position in the API accepts `() => value`. What varies is **what goes inside the wrapper**, because Whisq exposes three different source shapes: plain signals, keyed-`each` accessors, and `resource()` fields.

So the rule to remember is:

> _Wrap reactive reads in `() => ...`. Unwrap the source:_
> _- Signal → `.value`_
> _- Keyed-`each` item or `resource()` field → `()` (it's already an accessor)._

Two tokens to remember instead of one, but one consistent wrapper — and _zero_ hidden dependency arrays, stale closures, or re-render caveats.

---

## The three shapes at a glance

| # | Source                    | Outside reactive context              | Inside reactive context (getter) |
| - | ------------------------- | ------------------------------------- | -------------------------------- |
| 1 | Plain signal              | `sig.value` / `sig.peek()`            | `() => sig.value`                |
| 2 | Keyed `each()` item       | _(only exists inside the render fn)_  | `() => todo().text`              |
| 3 | `resource()` field        | `users.loading()` / `users.data()` …  | `() => users.loading()`          |

---

## Shape 1 — Plain signal: `sig.value` / `() => sig.value`

The source `signal()` returns is a property-shaped object. Read `.value` synchronously outside a reactive context. Inside one — a getter child, a getter prop, an `effect`, a `computed` body — wrap the same read in `() => ...`.

```ts
const count = signal(0);

// Outside: property access. Not tracked.
console.log(count.value);         // 0
count.value = 5;                  // setter

// Inside: wrapped in a getter so the surrounding effect re-runs.
span(() => count.value);          // re-renders when count changes
computed(() => count.value * 2);  // re-evaluates when count changes
effect(() => log(count.value));   // re-runs when count changes

// Peek — one-shot read without tracking (rare; use if you know you want it).
const snap = count.peek();
```

- **Common mistake:** passing `count.value` directly as a child → reads once, not reactive.
- **Writes:** `count.value = n` or `count.set(n)` or `count.update(fn)`.

## Shape 2 — Keyed `each()` item: `todo()`

Inside a keyed `each(items, (item) => …, { key })`, the `item` argument is an **accessor function** — you call it with `()` to get the current value. Wrapping the read in `() => todo().text` is what makes the child re-render when the array is replaced with new objects at the same key. Closing over `todo` and writing `.text` would be stale at the next array replacement (see WHISQ-62 for the fix that introduced this).

```ts
type Todo = { id: string; text: string; done: boolean };
const todos = signal<Todo[]>([]);

ul(
  each(
    () => todos.value,
    (todo) =>
      li(
        span(() => todo().text),                      // reactive text via accessor
        input({ type: "checkbox",
          ...bindField(todos, todo, "done", { as: "checkbox" }) }),
      ),
    { key: (t) => t.id },
  ),
);
```

- **`todo` is a function, not an object** — `todo.text` is `undefined`; TypeScript flags this.
- **Always wrap `todo()` in `() => ...`** for reactive reads — a bare `todo()` outside a getter is a one-shot snapshot.
- **Writes** go through the source signal, not the accessor. Use `bindField(source, item, key)` for the common "update field on an item" case; fall back to a manual event pair for arbitrary mutations.

Non-keyed `each(items, (item) => …)` (no `{ key }`) still passes plain `T`, because the whole list re-renders on every change — no stale-accessor risk. See [`reactive-shapes.md`](./reactive-shapes.md) for when to reach for `each` keyed vs. non-keyed.

## Shape 3 — `resource()` field: `users.loading()`

`resource(fetcher)` returns an object with function-shaped fields: `loading()`, `data()`, `error()`. They're accessor-shaped for the same reason keyed-each items are: reading through a function lets the reactive graph re-track on each read, so state transitions (loading → data, loading → error, data → refetching) update every consumer without re-plumbing.

```ts
const users = resource(() => fetch("/api/users").then((r) => r.json()));

div(
  when(() => users.loading(), () => p("Loading...")),
  when(() => !!users.error(),
    () => p({ class: "error" }, () => users.error()!.message)),
  when(() => !!users.data(),
    () => ul(each(() => users.data()!, (u) => li(u.name)))),
);
```

- **Call the field** — `users.loading()` not `users.loading`.
- **Wrap in `() =>`** at the reactive position — same pattern as signal reads.
- **Nullability** — `data()` / `error()` return `undefined` until the fetch completes. Gate with `when(() => users.loading(), ...)` or non-null assert inside a guard.

---

## A note on what stays live across component boundaries

All three access shapes survive being passed as component props, provided you pass **the accessor itself**, not a snapshot.

```ts
// Good: the child receives an accessor; reads stay live.
const TodoItem = component((props: { todo: () => Todo }) => {
  return li(() => props.todo().text);   // shape 2 — still works across boundary
});

// Bad: a snapshot captured once at parent setup; goes stale on array replacement.
const TodoItem = component((props: { todo: Todo }) => {
  return li(props.todo.text);           // frozen at first render
});
```

This is the subject of [#80](https://github.com/whisqjs/whisq/issues/80) — the worked example for component-boundary handoffs. If you pass a bare signal (`{ count: sig }` rather than `{ count: () => sig.value }`), children read `.value` inside their own `() =>`. Both work; pick based on what the child needs to do with it.

---

## See also

- [`reactive-shapes.md`](./reactive-shapes.md) — the four _positional_ shapes (where reactive values are consumed).
- [`batch-semantics.md`](./batch-semantics.md) — how `batch()` sequences multiple writes.
- [`ref.ts`](../src/ref.ts) — `ElementRef<T>` is a `Signal<T | null>`, so it follows shape 1 (`ref.value`, `() => ref.value`). Documented explicitly per WHISQ-63.
