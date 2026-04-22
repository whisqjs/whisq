---
"@whisq/core": minor
---

Two opt-in utility helpers, both on sub-path imports so apps that don't use them pay no bundle cost.

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
