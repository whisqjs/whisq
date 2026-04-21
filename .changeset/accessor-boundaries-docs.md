---
"create-whisq": patch
---

Document **accessors across component boundaries** — the silent-staleness bug that alpha.6 feedback called the single most uncertain moment in building a todo app.

[`packages/core/docs/access-shapes.md`](https://github.com/whisqjs/whisq/blob/develop/packages/core/docs/access-shapes.md) gains a full "Accessors across component boundaries" section with:

- A worked parent + child example where the child takes `{ todo: () => Todo }` and reads `props.todo()` inside getters.
- A counter-example showing the exact snapshot-at-setup pattern that silently breaks (row renders, never updates, stale `.id` after reorder).
- A variant table mapping parent source type (`Signal<T>`, keyed-`each` accessor, `resource()` field) to prop shapes and child read patterns.
- A mistakes table naming the four most common footguns (calling the accessor at the parent, snapshotting inside child setup, destructuring props, passing `.value[0]`).

All four scaffolded `CLAUDE.md` files gain the short version inline — parent + child skeleton + the "don't snapshot" rule — with a link to the canonical doc for depth.

Closes #80. Runtime-warning AC deferred to a P3 follow-up — static analysis (eslint / tsc) is a better fit than runtime instrumentation once real usage demands detection.
