---
"@whisq/core": minor
"create-whisq": patch
---

Add `bindPath(source, path, opts?)` — two-way binding for a field at an arbitrary **object path** in a signal-held record. Use when `bind()` doesn't apply because the field lives two or more levels deep (e.g. `user.profile.email`, `settings.billing.plan`). Follow-up to WHISQ-78 (`bindField`) for the nested-object case the feedback docs flagged as friction against the flat-binding primitives.

Exported from a new sub-path, `@whisq/core/forms`, so apps that only need `bind()` + `bindField()` (the 80% case) pay no bundle cost. Top-level `@whisq/core` stays at 5.25 KB gzipped.

```ts
import { bindPath } from "@whisq/core/forms";

form(
  input({ ...bindPath(user, ["profile", "name"]) }),
  input({ type: "email", ...bindPath(user, ["profile", "email"]) }),
  input({ type: "number", ...bindPath(user, ["profile", "age"], { as: "number" }) }),
  input({ type: "checkbox", ...bindPath(user, ["prefs", "dark"], { as: "checkbox" }) }),
);
```

### Behaviors worth leading with

- **Structural sharing on writes.** Writes produce a new root and new objects at every level on the path; sibling branches keep their reference identity so downstream `computed` / `effect` re-runs stay narrow.
- **Missing-intermediate creation.** Reading through a missing intermediate returns `undefined`; writing creates the object structure as needed.
- **Object keys only.** Array traversal is not supported in the path — use `bindField()` at the array level and compose. This keeps `bindPath` predictable and its implementation small.
- **Typed overloads** for depths 1–4; deeper paths work via the loose signature (same runtime, just less TS inference).

Mirrors `bind()` and `bindField()`'s discriminator shapes — text / number / checkbox / radio.

Scaffolded `CLAUDE.md` files gain a "Binding into nested records (opt-in, sub-path import)" block under Forms so AI-generated code for new projects discovers the pattern without reinventing it.

Closes #86.
