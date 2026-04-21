---
"create-whisq": patch
---

Document the three reactive **access shapes** — signal `.value`, keyed-`each` item accessor `()`, `resource()` field `()` — honestly, without papering over the fact that the uniform-`() => value` claim describes the _wrapper_ but not what goes inside it. New canonical framework doc at [`packages/core/docs/access-shapes.md`](https://github.com/whisqjs/whisq/blob/develop/packages/core/docs/access-shapes.md).

Each scaffolded project's `CLAUDE.md` now carries a three-row table and a link to the canonical doc so AI coding assistants don't have to re-derive the rule from scratch on every prompt.

Collateral updates:

- `packages/core/docs/reactive-shapes.md` now cross-links to `access-shapes.md`, drops the "uniform framing undersells" opener (access-shapes.md owns that framing now), and updates shape #4 from "manual event pair" to `bindField()` (shipped in WHISQ-78) with the manual pair demoted to escape-hatch status.
- Repo README bullet tightened from "uniform `() => value` reactive pattern" to "one reactive wrapper" with a link to the three read shapes.

Closes #79. `@whisq/core` runtime unchanged — pure docs/positioning work.
