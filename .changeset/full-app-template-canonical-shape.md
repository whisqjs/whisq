---
"create-whisq": minor
---

`full-app` template now scaffolds the canonical multi-file shape that the project-structure docs describe:

- **`src/components/`** — `CounterRow.ts` demonstrates the pattern for reusable UI pulled out of a page.
- **`src/lib/`** — `format.ts` demonstrates a pure utility module (no `@whisq/*` imports), including `formatCount()` and `clamp()` used by the scaffolded `CounterRow`.
- **`src/App.ts`** — now wraps `RouterView` in `errorBoundary`, so a thrown error in any page degrades to a retry UI instead of tearing down the whole app. Demonstrates the canonical error-boundary shape `App.ts` should own.
- **`src/pages/Home.ts`** — rewritten to consume `CounterRow` + `clamp`, connecting all four directories (`pages/` → `components/` → `lib/`) in one working example.

Closes the framework-side half of WHISQ-102. A whisq.dev companion page (`/examples/canonical-app-structure/`) is tracked for a follow-up PR.

Existing `full-app` behavior (router, stores/, styles.ts, pages/About.ts) is unchanged.
