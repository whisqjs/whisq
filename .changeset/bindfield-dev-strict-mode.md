---
"@whisq/core": minor
---

`bindField` now throws a `WhisqKeyByError` on no-match writes in dev mode (default `process.env.NODE_ENV !== "production"`) instead of silently logging to the console. A stale accessor or broken `keyBy` now surfaces immediately at the first click in `vite dev` instead of drowning in the console.

New option `strict?: boolean` lets callers pin the behaviour explicitly — `strict: true` throws in both envs; `strict: false` keeps the legacy warn-and-discard even in dev. Production behaviour is unchanged (warn-and-discard) unless `strict: true` is set.

```ts
// Default in vite dev: throws WhisqKeyByError
input({ ...bindField(todos, todo, "done", { as: "checkbox" }) })

// Opt out if a test deliberately exercises the no-match path:
input({ ...bindField(todos, todo, "done", { as: "checkbox", strict: false }) })
```

`WhisqKeyByError` carries `sourceKeys`, `targetKey`, and `field` so the error tells you what was in the source at write time vs. what the accessor was looking for. Both the error class and its `WhisqKeyByErrorFields` type are exported from `@whisq/core`.

Closes WHISQ-100.
