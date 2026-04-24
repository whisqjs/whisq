---
"@whisq/core": minor
---

Two small additive helpers to close the alpha.9 feedback loop — both opt-in on existing sub-path imports, no breaking changes.

- **`createStorageNamespace(prefix)`** on `@whisq/core/persistence` — returns a `{ persistedSignal }` view whose storage keys are transparently rewritten to `${prefix}:${key}`. Use when several Whisq apps share an origin (marketing site + dashboard + demo playground on the same host) and must not collide. A thin compositional wrapper — everything `persistedSignal` already supports (storage kind, schema, onSchemaFailure, …) passes straight through. Empty or whitespace prefixes are rejected so a forgotten interpolation fails loudly instead of silently using `":key"`.

  ```ts
  import { createStorageNamespace } from "@whisq/core/persistence";

  const app = createStorageNamespace("whisq-todo-app");
  export const todos = app.persistedSignal<Todo[]>("todos", []);
  //                                               ↑ actual key: "whisq-todo-app:todos"
  ```

- **`randomId(options?)`** on `@whisq/core/ids` — now accepts `{ prefix, rng }`. Zero-arg call is unchanged. `prefix` concatenates directly (no separator — pass `"todo_"` if that's what you want). `rng` replaces `Math.random` in the fallback synthesis and **also bypasses `crypto.randomUUID`**, so a seeded PRNG produces the same id on every platform. The primary use-case is deterministic ids for snapshot tests — no more globally stubbing `crypto.randomUUID`.

  ```ts
  import { randomId } from "@whisq/core/ids";

  randomId();                            // default: crypto.randomUUID
  randomId({ prefix: "todo_" });         // "todo_01K1…"
  randomId({ rng: seedrandom(42) });     // deterministic across environments
  ```

Closes WHISQ-134. Source: `dev/feedback/latest/FRAMEWORK_FEEDBACK_CLAUDE_v0.1.0-alpha.9.md` (N5, N7).
