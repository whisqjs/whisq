---
"@whisq/core": minor
---

Export two type aliases for extracted event handlers (WHISQ-64).

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
