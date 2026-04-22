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

## Accessors across component boundaries

All three access shapes survive being passed as component props — **as long as you pass the accessor itself, not a snapshot**. This section covers what that means in practice, what fails if you snapshot, and which prop shape to pick for each source.

### What survives the boundary

- **Signals** — pass the signal object. The child reads `.value` inside its own `() =>`.
- **Keyed-`each` items** — pass the accessor function (`todo` as received from the render callback — don't call it at the parent). The child calls `props.todo()` inside its own `() =>`.
- **`resource()` fields** — pass the accessor function (`users.data` — don't call it). The child calls `props.data()` inside its own `() =>`.

The common rule: **the thing you hand to the child must be re-readable**. A raw `.value` or `todo()` read at the parent is a snapshot — the child gets a frozen copy and never sees updates.

### Worked example: split a todo row into its own component

```ts
// parent: owns the todos signal
type Todo = { id: string; text: string; done: boolean };
const todos = signal<Todo[]>([
  { id: "a", text: "groceries", done: false },
  { id: "b", text: "ship release", done: true },
]);

function TodoList() {
  return ul(
    each(
      () => todos.value,
      (todo) => TodoItem({ todo }),            // pass the accessor as-is
      { key: (t) => t.id },
    ),
  );
}

// child: reads props.todo() inside its own getters
const TodoItem = component((props: { todo: () => Todo }) => {
  return li(
    input({
      type: "checkbox",
      ...bindField(todos, props.todo, "done", { as: "checkbox" }),
    }),
    span(() => props.todo().text),              // re-reads on every source change
    button(
      { onclick: () => remove(props.todo().id) },
      "✕",
    ),
  );
});
```

Everything the child needs is reachable from `props.todo()`. Nothing is captured in a local variable at setup. When the parent replaces `todos.value` with a new array that still contains the same `id`, the reconciler reuses this `TodoItem` instance; the per-entry `itemSig` gets the new object; `props.todo()` returns that new object; every getter in the child re-reads.

### Counter-example: snapshot at setup (the bug you can't reproduce in a unit test)

```ts
// DON'T DO THIS
const TodoItem = component((props: { todo: () => Todo }) => {
  const todo = props.todo();                    // snapshot captured once
  return li(
    span(todo.text),                            // static — never updates
    button(
      { onclick: () => remove(todo.id) },       // stale id after reorder
      "✕",
    ),
  );
});
```

Symptoms:

- The todo row renders once, then never reflects changes to `.text` or `.done` made elsewhere.
- After reordering the list, clicking `✕` may remove the wrong row — the closure holds the old item's `.id`.
- Nothing _throws_. No dev-mode error. The UI just quietly falls out of sync.

The failure mode is unmistakable once you know it, but unreproducible in a fresh-mount test — you only see it on the second parent state change. That's exactly why the rule needs to be written down rather than left as tribal knowledge.

### Passing a signal vs. passing an accessor

Both shapes work; pick by who "owns" the binding.

| Parent holds          | Prop shape to pass                  | Child reads via        |
| --------------------- | ----------------------------------- | ---------------------- |
| A `Signal<T>`          | `{ count: sig }` (the signal itself) | `() => props.count.value` |
| A `Signal<T>` — child should only read  | `{ count: () => sig.value }` (pre-wrapped getter) | `() => props.count()` |
| A keyed-`each` item    | `{ todo }` (the accessor)            | `() => props.todo()`   |
| A `resource()` field   | `{ data: users.data }` (the accessor) | `() => props.data()`   |

- Pass the raw signal when the child might need to **write** (`bind(props.sig)`). The signal object carries both read and write.
- Pass a pre-wrapped getter `() => sig.value` when the child should **only read** — the type `() => T` is the smallest capability and is identical-shaped to the keyed-each/resource case, so generic child components can accept any of them.
- **Never call the accessor at the parent** — `TodoItem({ todo: todo() })` snapshots it.

### Common mistakes at the boundary

| Mistake                                         | What happens                                                      | Fix                                             |
| ----------------------------------------------- | ----------------------------------------------------------------- | ----------------------------------------------- |
| `TodoItem({ todo: todo() })` (call at parent)   | Child receives frozen item; stale after array replacement.       | `TodoItem({ todo })` — pass the accessor.       |
| `const todo = props.todo()` inside child setup   | Snapshots at first mount; ignores later updates.                 | Read inside each getter: `() => props.todo().x`. |
| Destructuring props in setup (`const { todo } = props`) | Loses per-render re-read if Whisq ever swaps props (and is a footgun elsewhere too). | Read fields off `props` directly: `() => props.todo().text`. |
| Passing `todos.value[0]` as a prop              | Same as snapshotting — you read `.value` at the parent.          | Pass a getter: `{ first: () => todos.value[0] }`. |

See also the structural guards shipped in [#81](https://github.com/whisqjs/whisq/issues/81) — `WhisqStructureError` catches wrong-shaped children at the boundary and points at the fix.

---

## See also

- [`reactive-shapes.md`](./reactive-shapes.md) — the four _positional_ shapes (where reactive values are consumed).
- [`batch-semantics.md`](./batch-semantics.md) — how `batch()` sequences multiple writes.
- [`ref.ts`](../src/ref.ts) — `ElementRef<T>` is a `Signal<T | null>`, so it follows shape 1 (`ref.value`, `() => ref.value`). Documented explicitly per WHISQ-63.
