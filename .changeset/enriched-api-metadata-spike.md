---
"@whisq/core": minor
"@whisq/mcp-server": minor
---

**Spike:** first slice of the enriched `public-api.json` from #103 — ships a drift-validated per-symbol metadata manifest, populates it for the `signals` topic, and wires the MCP server's `signals` docs to consume it.

### `@whisq/core`

- New artefact: `dist/public-api-annotated.json`. Schema spec at `packages/core/docs/api-metadata-schema.md`. Current shape — `{ version, schemaVersion: 1, symbols: SymbolEntry[] }` — is frozen behind `schemaVersion` so consumers can guard against breaking changes.
- New exports-map entry: `"@whisq/core/public-api-annotated.json"` — the public path consumers import from.
- Hand-curated source of truth at `packages/core/metadata/api-enrichment.json`. The build step runs `scripts/generate-api-metadata.mjs` after `generate-public-api.mjs` and fails with a non-zero exit if:
  - a `symbols[*].name` is not in `public-api.json` exports (drift),
  - a `seeAlso[*]` reference is not in `public-api.json` exports (drift),
  - any required field on a `SymbolEntry` is missing or wrong type,
  - a duplicate symbol entry appears.
- Populated for one topic this release: `signals` (`signal`, `computed`, `effect`, `batch`). The names-only `public-api.json` is unchanged — this is a sibling file, not a replacement. See #103 for the path to unification.

### `@whisq/mcp-server`

- New `@whisq/core` workspace dependency (was previously untyped docs; now consumes the annotated manifest).
- `api-docs.ts` `signals` topic is generated from the enriched manifest at build time — no more hand-written drift. The other topics (`elements`, `components`, `routing`, …) remain hand-written until the schema stabilises; migrating them is a follow-up tracked against #103.
- Load-bearing phrases consumers grep for (`signal(`, `computed(`, `.value`, `peek()`, `batch(() =>`) are locked in by a new regression test block.

### Out of scope (follow-ups)

- CI drift check between `public-api.json` and `public-api-annotated.json` (all existing exports must have enrichment) — follow-up once the other topics migrate.
- Migrating the remaining MCP topics — mechanical once this spike's shape is validated across a release cycle.
- Unifying the two manifests into one — option A in #103; gated on 1–2 releases of stable schema.

Closes #138.
