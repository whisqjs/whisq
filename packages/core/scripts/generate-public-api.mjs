// ============================================================================
// Whisq Core — Public API manifest generator
//
// Reads src/index.ts, extracts every named export (values + types),
// and writes dist/public-api.json with { version, exports[] }.
//
// The manifest ships with the npm package, so consumers (e.g. the docs
// repo's drift check) can fetch it from:
//
//   https://unpkg.com/@whisq/core@<version>/dist/public-api.json
//
// Pure extraction logic is exported so tests can exercise it without disk IO.
// ============================================================================

import { readFileSync, writeFileSync, mkdirSync, existsSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";

const RE_REEXPORT =
  /export\s+(?:type\s+)?\{([\s\S]*?)\}\s+from\s+["'][^"']+["']/g;

/**
 * Extract every named export from an `index.ts` re-export file.
 * Handles value re-exports, `type` re-exports, `as` aliases, and multi-line
 * export blocks. Returns sorted unique names.
 */
export function extractExports(source) {
  // Strip whole-line and end-of-line single-line comments so commented-out
  // re-export statements don't leak into the manifest.
  const cleaned = source.replace(/\/\/[^\n]*/g, "");
  const names = new Set();
  for (const match of cleaned.matchAll(RE_REEXPORT)) {
    // Strip single-line // comments that live inside the re-export block so
    // they don't leak into the extracted names.
    const inner = match[1].replace(/\/\/[^\n]*/g, "");
    for (const raw of inner.split(",")) {
      const part = raw.trim();
      if (!part) continue;
      const aliasMatch = part.match(/\s+as\s+(\w+)$/);
      const name = aliasMatch
        ? aliasMatch[1]
        : part.replace(/^type\s+/, "").trim();
      // Only keep clean identifiers — reject anything that still contains
      // whitespace or punctuation (defensive against odd formatting).
      if (/^\w+$/.test(name)) {
        names.add(name);
      }
    }
  }
  return [...names].sort();
}

/**
 * Build the manifest object from a version string and the source file content.
 */
export function generateManifest(version, source) {
  return {
    version,
    exports: extractExports(source),
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
  const src = readFileSync(resolve(pkgRoot, "src/index.ts"), "utf8");

  const manifest = generateManifest(pkg.version, src);

  const outDir = resolve(pkgRoot, "dist");
  if (!existsSync(outDir)) mkdirSync(outDir, { recursive: true });

  const outPath = resolve(outDir, "public-api.json");
  writeFileSync(outPath, JSON.stringify(manifest, null, 2) + "\n");

  console.log(
    `Wrote ${outPath}: ${manifest.exports.length} exports, version ${manifest.version}`,
  );
}
