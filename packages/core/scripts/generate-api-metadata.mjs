// ============================================================================
// Whisq Core — Enriched API metadata generator (WHISQ-138)
//
// Reads metadata/api-enrichment.json (curated source of truth) and merges it
// with the current package version + the names-only export list from
// dist/public-api.json. Writes dist/public-api-annotated.json — the first
// consumer-facing artefact of the schema defined in
// packages/core/docs/api-metadata-schema.md.
//
// Drift guards (non-zero exit on failure):
//   1. Every symbols[*].name must be in public-api.json's exports[].
//   2. Every seeAlso[*] reference must be in public-api.json's exports[].
//   3. Every SymbolEntry must have all required fields with matching types.
//
// Pure validation / assembly logic is exported so the (future) test file can
// exercise it without touching the filesystem. The CLI block at the bottom
// handles IO; everything above it is deterministic data-in / data-out.
// ============================================================================

import { readFileSync, writeFileSync, existsSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";

const REQUIRED_SYMBOL_FIELDS = [
  "name",
  "kind",
  "signature",
  "summary",
  "gotchas",
  "examples",
  "since",
  "seeAlso",
  "topic",
];

const VALID_KINDS = new Set([
  "function",
  "class",
  "type",
  "interface",
  "const",
  "namespace",
]);

/**
 * Validate a single SymbolEntry against the schema. Returns an array of
 * human-readable error strings; empty array means the entry is valid.
 */
export function validateSymbolEntry(entry, exportNames) {
  const errs = [];
  if (typeof entry !== "object" || entry === null) {
    return [`entry is not an object`];
  }

  for (const field of REQUIRED_SYMBOL_FIELDS) {
    if (!(field in entry)) {
      errs.push(`missing required field: "${field}"`);
    }
  }
  if (errs.length > 0) return errs;

  if (typeof entry.name !== "string" || entry.name.length === 0) {
    errs.push(`name must be a non-empty string`);
  }
  if (!VALID_KINDS.has(entry.kind)) {
    errs.push(
      `kind "${entry.kind}" is not one of ${[...VALID_KINDS].join(" | ")}`,
    );
  }
  for (const strField of ["signature", "summary", "since", "topic"]) {
    if (typeof entry[strField] !== "string" || entry[strField].length === 0) {
      errs.push(`${strField} must be a non-empty string`);
    }
  }
  for (const arrField of ["gotchas", "examples", "seeAlso"]) {
    if (!Array.isArray(entry[arrField])) {
      errs.push(`${arrField} must be an array`);
    } else if (entry[arrField].some((s) => typeof s !== "string")) {
      errs.push(`${arrField} must contain only strings`);
    }
  }

  if (errs.length > 0) return errs;

  if (!exportNames.has(entry.name)) {
    errs.push(
      `name "${entry.name}" is not in public-api.json exports — drift`,
    );
  }
  for (const ref of entry.seeAlso) {
    if (!exportNames.has(ref)) {
      errs.push(
        `seeAlso reference "${ref}" (from ${entry.name}) is not in public-api.json exports — drift`,
      );
    }
  }

  return errs;
}

/**
 * Build the annotated manifest. Returns `{ ok: true, manifest }` on success
 * or `{ ok: false, errors }` when any drift / schema violation is found.
 */
export function buildAnnotatedManifest({ version, exports, enrichment }) {
  const exportNames = new Set(exports);
  const errors = [];

  if (!enrichment || typeof enrichment !== "object") {
    return { ok: false, errors: ["enrichment payload is missing or not an object"] };
  }
  if (enrichment.schemaVersion !== 1) {
    errors.push(
      `enrichment.schemaVersion must be 1 (got ${JSON.stringify(enrichment.schemaVersion)})`,
    );
  }
  if (!Array.isArray(enrichment.symbols)) {
    return {
      ok: false,
      errors: [...errors, "enrichment.symbols must be an array"],
    };
  }

  const seenNames = new Set();
  for (const entry of enrichment.symbols) {
    const entryErrs = validateSymbolEntry(entry, exportNames);
    if (entryErrs.length > 0) {
      const label = typeof entry?.name === "string" ? entry.name : "<unknown>";
      for (const err of entryErrs) {
        errors.push(`[${label}] ${err}`);
      }
      continue;
    }
    if (seenNames.has(entry.name)) {
      errors.push(`[${entry.name}] duplicate symbol entry`);
    }
    seenNames.add(entry.name);
  }

  if (errors.length > 0) {
    return { ok: false, errors };
  }

  const symbols = [...enrichment.symbols].sort((a, b) =>
    a.name.localeCompare(b.name),
  );

  return {
    ok: true,
    manifest: {
      version,
      schemaVersion: 1,
      symbols,
    },
  };
}

// ── CLI ────────────────────────────────────────────────────────────────────

const isDirectRun =
  import.meta.url === `file://${process.argv[1]}` ||
  import.meta.url === `file:///${process.argv[1].replace(/\\/g, "/")}`;

if (isDirectRun) {
  const __dirname = dirname(fileURLToPath(import.meta.url));
  const pkgRoot = resolve(__dirname, "..");

  const pkg = JSON.parse(
    readFileSync(resolve(pkgRoot, "package.json"), "utf8"),
  );

  const publicApiPath = resolve(pkgRoot, "dist/public-api.json");
  if (!existsSync(publicApiPath)) {
    console.error(
      `[generate-api-metadata] ${publicApiPath} not found — run generate-public-api.mjs first.`,
    );
    process.exit(1);
  }
  const publicApi = JSON.parse(readFileSync(publicApiPath, "utf8"));

  const enrichmentPath = resolve(pkgRoot, "metadata/api-enrichment.json");
  const enrichment = JSON.parse(readFileSync(enrichmentPath, "utf8"));

  const result = buildAnnotatedManifest({
    version: pkg.version,
    exports: publicApi.exports,
    enrichment,
  });

  if (!result.ok) {
    console.error("[generate-api-metadata] validation failed:");
    for (const err of result.errors) {
      console.error(`  - ${err}`);
    }
    process.exit(1);
  }

  const outPath = resolve(pkgRoot, "dist/public-api-annotated.json");
  writeFileSync(outPath, JSON.stringify(result.manifest, null, 2) + "\n");

  console.log(
    `Wrote ${outPath}: ${result.manifest.symbols.length} symbols, version ${result.manifest.version} (schemaVersion ${result.manifest.schemaVersion})`,
  );
}
