---
"create-whisq": patch
---

Document the four reactive shapes — getter child, getter prop, `bind()` spread, and manual event pair — inside the `CLAUDE.md` that every scaffolded project ships with. Four-row cheat-sheet table plus the one-line decision flow (_"single signal you own → `bind()`; field inside an item inside a signal-held array → manual event pair"_) so AI coding assistants (Claude Code, Cursor, etc.) have the taxonomy in their context from the first prompt.

Also explicitly calls out that inside a keyed `each(..., { key })`, the callback's `item` argument is an accessor function — `todo()` not `todo` — so field reads don't go stale after the underlying array is replaced.

The full canonical taxonomy lives in the framework repo at [`packages/core/docs/reactive-shapes.md`](https://github.com/whisqjs/whisq/blob/develop/packages/core/docs/reactive-shapes.md). The docs-site LLM reference card will port the same content as a follow-up.

No API change.
