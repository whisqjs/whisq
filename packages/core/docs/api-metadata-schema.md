# Whisq Core — API Metadata Schema (v1)

This document specifies the shape of `packages/core/dist/public-api-annotated.json` — the **enriched** companion to the names-only `dist/public-api.json`. It's the first consumer-facing artefact for AI-native tooling that needs structured knowledge about framework symbols: not just "does `signal` exist", but "what's its shape, what are its common misuse patterns, what else is worth reading next."

Status: **schema v1, spike**. Populated for one topic (`signals`) as proof-of-value. Expected to stabilise across alpha.10–alpha.11 as consumers prove the shape; see #103 for the umbrella roadmap.

## Why a separate manifest

The existing `dist/public-api.json` is a **drift-guard**: a flat list of export names that external tooling (docs pages, the MCP server, pre-commit checks) uses to detect when the framework's exported surface has changed. Annotating it in-place would risk breaking those consumers. The enriched manifest is a sibling file with its own URL, its own contract, and an explicit `schemaVersion` field so consumers can guard against breaking changes as the shape evolves.

Once v1 is validated (2+ releases, 2+ consumers), we may unify into a single file (see #103 option A). Until then, both files exist side-by-side.

## File locations

| File | Purpose |
| --- | --- |
| `packages/core/metadata/api-enrichment.json` | **Source of truth** — curated per-symbol metadata, hand-edited. Not shipped. |
| `packages/core/dist/public-api-annotated.json` | **Build output** — version-stamped, drift-validated manifest. Shipped in the npm tarball. |
| `packages/core/scripts/generate-api-metadata.mjs` | Generator — reads `metadata/api-enrichment.json` + `dist/public-api.json` + `package.json`, writes the build output. |

Consumers import from the package exports map:

```ts
import annotated from "@whisq/core/public-api-annotated.json" with { type: "json" };
```

## Consumer patterns (WHISQ-140)

The manifest has two supported retrieval shapes. The choice matters because the unpkg `@latest` CDN alias can lag the npm registry's `latest` dist-tag by minutes to hours after each publish — a consumer that resolves "the current API" through the CDN alias will silently read the previous version's manifest during that window.

### Pattern 1 — workspace-pinned (the MCP server)

For code that builds against Whisq as a dependency and ships alongside it:

```ts
// packages/mcp-server/src/tools/api-docs.ts
import annotatedManifest from "@whisq/core/public-api-annotated.json" with { type: "json" };
```

`@whisq/core` is a `workspace:*` dep; the symlink (or the installed tarball in downstream packages) always resolves to the exact version listed in `package.json`. There is no CDN and no lag window. The MCP server's `signals` topic uses this pattern — see `packages/mcp-server/src/tools/api-docs.ts`.

Use this when the consumer ships with a pinned `@whisq/core` version — it is the cheapest and most reliable shape.

### Pattern 2 — CDN-resolved via the registry (ad-hoc AI tooling)

For AI scaffolders, docs generators, or any out-of-tree tool that wants the **latest published** manifest without pinning a dep:

```sh
# Never hit unpkg.com/@whisq/core@latest directly — it lags npm.
# Resolve via the registry, then request the pinned version URL.

URL=$(node packages/core/scripts/resolve-latest-api.mjs --url)
curl -sSL "$URL" | jq .

# Or as a one-liner for CI pipelines:
VERSION=$(node packages/core/scripts/resolve-latest-api.mjs --version)
curl -sSL "https://unpkg.com/@whisq/core@${VERSION}/dist/public-api.json"
```

The `resolve-latest-api.mjs` helper (WHISQ-140) hits `https://registry.npmjs.org/@whisq/core/latest` first — the registry API is authoritative and updates within seconds of publish — then constructs the `https://unpkg.com/@whisq/core@${version}/...` URL with an explicit version pin. unpkg serves pinned-version URLs out of the exact tarball, so the CDN-lag window is bypassed entirely.

Use `--annotated-url` to target this document's subject (`public-api-annotated.json`) instead of the names-only `public-api.json`.

### Anti-pattern — `unpkg.com/@whisq/core@latest/...`

Fetching `https://unpkg.com/@whisq/core@latest/dist/public-api.json` (or `…@latest/dist/public-api-annotated.json`) is the shape that produces the silent-staleness bug. The `@latest` alias is CDN-cached; during the propagation window after a publish, the URL returns the previous version's manifest even though `npm view @whisq/core version` already reports the current one. AI workflows that fall into this trap produce feedback / code against an API surface that shipped under a different version number than they cite. The post-release CI check in `.github/workflows/release.yml` warns when this window is still open for the current publish.

## Top-level shape

```ts
interface EnrichedManifest {
  /** npm package version the manifest was generated for, e.g. "0.1.0-alpha.9". */
  version: string;
  /** Incremented on breaking changes to this schema. v1 as of this PR. */
  schemaVersion: 1;
  /** One entry per documented symbol. Ordered alphabetically by `name`. */
  symbols: SymbolEntry[];
}
```

## `SymbolEntry` shape

```ts
interface SymbolEntry {
  /** The exported name. MUST appear in public-api.json (drift-validated). */
  name: string;
  /** What kind of declaration this is. */
  kind: "function" | "class" | "type" | "interface" | "const" | "namespace";
  /** The canonical TypeScript signature as a single string. */
  signature: string;
  /**
   * One-sentence description. Complete sentence, not fragment. Leads with the verb
   * for functions ("Create a reactive value.", "Compose two bind results.").
   */
  summary: string;
  /**
   * Zero-or-more known misuse patterns. Each is a complete sentence describing
   * what goes wrong and how to avoid it. Keep to one-liners when possible; escape
   * hatches and long explanations belong in the full docs, not here.
   */
  gotchas: string[];
  /**
   * Zero-or-more idiomatic examples. Code strings (no markdown fences). The
   * consumer decides how to present them (Markdown code block, plain text, …).
   */
  examples: string[];
  /** First version the symbol was exported. Used by the consumer for "since" hints. */
  since: string;
  /** Other symbol names the reader is likely to want next. Drift-validated. */
  seeAlso: string[];
  /**
   * Coarse-grained topic grouping for consumers that organise docs by topic
   * rather than by symbol. Aligns with the MCP server's `ApiTopic` enum where
   * possible ("signals" | "elements" | "components" | "routing" | …).
   */
  topic: string;
}
```

## Drift guards

The generator MUST enforce, and fail the build with a non-zero exit code, if any of:

1. A `symbols[*].name` that isn't in `public-api.json`'s `exports[]` list.
2. A `seeAlso[*]` reference that isn't in `public-api.json`'s `exports[]` list.
3. A missing required field on a `SymbolEntry`.

This guarantees the enriched manifest can't reference ghosts or lag behind the names-only list.

## Worked example — `signal()`

The source-of-truth entry (hand-edited in `metadata/api-enrichment.json`):

```json
{
  "name": "signal",
  "kind": "function",
  "signature": "signal<T>(initial: T): Signal<T>",
  "summary": "Create a reactive value that tracks reads and notifies on writes.",
  "gotchas": [
    "Mutating an array or object in place (e.g. items.value.push(x)) does not trigger updates — use items.value = [...items.value, x] so the identity changes.",
    "Passing a signal as an element child (e.g. div(count.value)) captures the value once. Wrap in a function (e.g. () => count.value) for reactive rendering.",
    "peek() reads without tracking — do not use it inside a computed/effect expecting reactivity."
  ],
  "examples": [
    "const count = signal(0);\ncount.value = 5;\ncount.update(n => n + 1);\ncount.peek();"
  ],
  "since": "0.1.0-alpha.1",
  "seeAlso": ["computed", "effect", "batch"],
  "topic": "signals"
}
```

After the generator runs, that entry appears inside the top-level `symbols` array of `dist/public-api-annotated.json`, with the package's current `version` and `schemaVersion: 1` stamped in.

## Evolution rules

- **Additive changes** (new optional fields on `SymbolEntry`, new topics) do not bump `schemaVersion`.
- **Breaking changes** (removing a field, renaming a field, changing a field's type) bump `schemaVersion` to `2`. Consumers guard on the number.
- **The `topic` grouping is conventional, not enforced** — new topics can be added freely. The MCP server's `ApiTopic` enum is the de-facto registry.

## Open items for v2+

Tracked on #103 (umbrella):

- Stability annotations (`experimental` | `stable` | `deprecated`) once Whisq reaches `0.1.0`.
- Parameter-level documentation (`params[]`) for functions with complex options objects.
- Unification with `public-api.json` (option A from #103) once schema is stable.
- TSDoc auto-extraction as a secondary source, with curated enrichment filling gaps.
