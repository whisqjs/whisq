---
"@whisq/core": minor
---

Add `onSchemaFailure?: (err: unknown, raw: string) => void` option to `persistedSignal`. Invoked synchronously **before** fallback to `initial` when `deserialize` throws (malformed stored JSON) or `schema` throws (validator rejects). Receives the thrown error and the exact raw string read from storage — use it to log to Sentry / show a recovery UI / decide between migrate-vs-reset.

```ts
const todos = persistedSignal<Todo[]>("todos", [], {
  schema: validateTodosShape,
  onSchemaFailure: (err, raw) => {
    Sentry.captureException(err, { extra: { key: "todos", raw } });
  },
});
```

The callback is **not** invoked on first-visit (`raw` would be `null`, not a failure) or on storage-access errors (private mode, disabled storage — environment faults, not schema faults). If the callback itself throws, the exception is caught and logged via `console.warn` so a broken diagnostic pipeline can't prevent signal construction.

Closes WHISQ-98.
