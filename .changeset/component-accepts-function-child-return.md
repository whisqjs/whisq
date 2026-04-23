---
"@whisq/core": minor
---

`component()`'s setup function can now return a **function child** directly — the shape `match()` / `when()` / an ad-hoc `() => div(...)` produce. Previously, a component whose whole job was to render one of several branches needed a sacrificial wrapper `div` whose only purpose was to host the function child:

```ts
// Before — wrapper div has no job other than holding match()
const Screen = component(() =>
  div(
    match(
      [() => view.value === "loading", () => p("loading")],
      [() => view.value === "data", () => DataView({})],
      () => p("empty"),
    ),
  ),
);

// Now — match() is the component root directly
const Screen = component(() =>
  match(
    [() => view.value === "loading", () => p("loading")],
    [() => view.value === "data", () => DataView({})],
    () => p("empty"),
  ),
);
```

Works for any zero-arg function return — `when()`, `match()`, or a plain `() => someNode`.

Mechanism is the same fragment + start/end marker pattern `errorBoundary` and keyed `each` already use internally: a fragment holds markers that survive insertion into the real parent, and an effect renders the function's result between them on every source change. `onMount` / `onCleanup` hooks registered inside setup continue to fire as expected. Branch switches dispose the previous `WhisqNode` before inserting the next — no node leaks.

Backwards compatible. The widened setup signature is `(props: P) => WhisqNode | (() => unknown)`; existing `component(() => div(...))` code is unaffected. Dev-mode `WhisqStructureError` messages now mention both accepted shapes.

Closes WHISQ-121. The docs-side companion (whisqjs/whisq.dev#162) will need an update once the `/api/match/` page can point at "match() works directly as a component root" as the idiom.
