---
"@whisq/core": minor
"create-whisq": patch
---

Add `persistedSignal(key, initial, opts?)` — a `Signal<T>` backed by `localStorage` / `sessionStorage`, exported from the new sub-path `@whisq/core/persistence` so apps that don't need it pay zero bundle cost.

```ts
import { persistedSignal } from "@whisq/core/persistence";

export const todos = persistedSignal<Todo[]>("todos", []);
```

Closes the "every Whisq app reinvents the guarded-localStorage-read-with-effect-writer pattern" problem identified by the alpha.6 feedback. Blessed shape, one import, no hand-rolling.

### Behaviors worth leading with

- **SSR-safe.** On the server (`typeof window === "undefined"`) returns a plain signal initialized to `initial` with no storage subscription.
- **Schema-validated.** If the stored JSON is malformed, or an optional `schema(raw)` validator throws, the signal falls back to `initial` rather than crashing at mount.
- **Quota-safe.** If a write throws (`QuotaExceededError`, private mode), logs a warning and keeps the in-memory value — the app keeps working.
- **Module-scope intent.** Call `persistedSignal` at module scope in your `stores/` file, not inside components — the write effect lives for the module lifetime by design.

Options: `storage: "local" | "session"`, `serialize` / `deserialize` (default JSON), `schema` (validation on load).

Scaffolded templates' `CLAUDE.md` files gain a "Persisted stores (opt-in, sub-path import)" block under Shared State so AI-generated code for new projects can discover the pattern without reinventing it.

Closes #82.
