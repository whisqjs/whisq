---
"@whisq/core": patch
---

Fix `theme()` and `sheet()` throwing `ReferenceError: document is not defined` under SSR (server-side rendering). The shared internal `injectCSS()` helper now short-circuits when `typeof document === "undefined"`, matching the SSR-safe pattern that `persistedSignal` already uses.

User-observable impact:

- **`theme()`**: SSR call is a no-op (no `<style>` tag is written; client-side hydration takes over on mount). Previously threw.
- **`sheet()`**: SSR call returns the in-memory classMap (so server-rendered HTML can reference the correct class names for the client to hydrate against), but skips the DOM injection step. Previously threw on the injection line.

Also clarified `theme()` JSDoc: **"call once at module scope"** and **"duplicate calls = last-call-wins"** are now explicit (the duplicate-calls behavior already held; the docs didn't say so).

Closes WHISQ-99 (framework side). Docs work on whisq.dev — the `/core-concepts/styling/` and `/api/theme/` pages — will land as a companion PR in that repo.
