// ============================================================================
// Whisq Core — Authoritative "latest API manifest" URL resolver (WHISQ-140)
//
// The CDN-backed `unpkg.com/@whisq/core@latest/dist/public-api.json` URL can
// lag the npm registry by minutes to hours after each publish. During that
// window, AI tools that resolve "the latest Whisq" through the CDN silently
// get the *previous* version's manifest — even though `npm view @whisq/core
// version` reports the current one. The v0.1.0-alpha.9 Codex feedback was
// written against a stale alpha.8 manifest before the reviewer noticed.
//
// This script eliminates the lag window: it hits the npm registry API first
// (authoritative, low-latency), reads the current `version`, and prints the
// pinned-version CDN URL that cannot serve stale content. AI scaffolders and
// docs generators that want "the latest API surface" should chain the two:
//
//   CORE_VERSION=$(node packages/core/scripts/resolve-latest-api.mjs --version)
//   curl -sSL "$(node packages/core/scripts/resolve-latest-api.mjs --url)"
//
// or the convenience one-shot:
//
//   curl -sSL "$(node packages/core/scripts/resolve-latest-api.mjs --url)" \
//     | jq .
//
// Pure URL-building and version-parsing logic is exported so the unit test
// exercises them without network I/O.
// ============================================================================

const REGISTRY_URL = "https://registry.npmjs.org/@whisq/core/latest";
const DEFAULT_PACKAGE = "@whisq/core";

/**
 * Build the pinned unpkg URL for the `public-api.json` (names-only) manifest
 * at a specific version. The `@${version}` pin means unpkg serves the exact
 * tarball — never a cached "@latest" alias.
 */
export function pinnedPublicApiUrl(version, packageName = DEFAULT_PACKAGE) {
  assertNonEmptyString(version, "version");
  assertNonEmptyString(packageName, "packageName");
  return `https://unpkg.com/${packageName}@${encodeURIComponent(version)}/dist/public-api.json`;
}

/**
 * Build the pinned unpkg URL for the enriched `public-api-annotated.json`
 * manifest (shipped since WHISQ-138) at a specific version.
 */
export function pinnedAnnotatedApiUrl(version, packageName = DEFAULT_PACKAGE) {
  assertNonEmptyString(version, "version");
  assertNonEmptyString(packageName, "packageName");
  return `https://unpkg.com/${packageName}@${encodeURIComponent(version)}/dist/public-api-annotated.json`;
}

/**
 * Validate and extract the `version` field from the npm registry's
 * `/:pkg/latest` payload. Returns the parsed semver string or throws with
 * a context-rich error the CLI surfaces verbatim.
 */
export function extractVersion(registryPayload) {
  if (registryPayload === null || typeof registryPayload !== "object") {
    throw new TypeError(
      "registry payload is not an object — expected { version, ... }",
    );
  }
  const version = registryPayload.version;
  if (typeof version !== "string" || version.length === 0) {
    throw new TypeError(
      `registry payload is missing a string "version" field (got ${JSON.stringify(version)})`,
    );
  }
  return version;
}

function assertNonEmptyString(value, name) {
  if (typeof value !== "string" || value.length === 0) {
    throw new TypeError(`${name} must be a non-empty string`);
  }
}

/**
 * Resolve the current `@whisq/core` version via the npm registry. Caller
 * supplies a fetch implementation — in the CLI that's the global `fetch`;
 * tests pass a stub.
 */
export async function resolveLatestVersion({
  fetch: fetchImpl = globalThis.fetch,
  registryUrl = REGISTRY_URL,
} = {}) {
  if (typeof fetchImpl !== "function") {
    throw new Error(
      "no fetch implementation — pass { fetch } or run on Node 18+ with global fetch",
    );
  }
  const response = await fetchImpl(registryUrl);
  if (!response || !response.ok) {
    const status = response ? response.status : "no response";
    throw new Error(
      `npm registry ${registryUrl} returned ${status} — cannot resolve @whisq/core version`,
    );
  }
  const payload = await response.json();
  return extractVersion(payload);
}

// ── CLI ────────────────────────────────────────────────────────────────────

const isDirectRun =
  import.meta.url === `file://${process.argv[1]}` ||
  import.meta.url === `file:///${process.argv[1].replace(/\\/g, "/")}`;

if (isDirectRun) {
  const args = process.argv.slice(2);
  const mode = args[0] ?? "--url";

  try {
    const version = await resolveLatestVersion();
    switch (mode) {
      case "--version":
        process.stdout.write(`${version}\n`);
        break;
      case "--url":
        process.stdout.write(`${pinnedPublicApiUrl(version)}\n`);
        break;
      case "--annotated-url":
        process.stdout.write(`${pinnedAnnotatedApiUrl(version)}\n`);
        break;
      case "--help":
      case "-h":
        process.stdout.write(
          [
            "resolve-latest-api — resolve @whisq/core latest via npm registry",
            "",
            "Usage: node packages/core/scripts/resolve-latest-api.mjs [--url | --annotated-url | --version | --help]",
            "",
            "  --url             Pinned URL for dist/public-api.json (default).",
            "  --annotated-url   Pinned URL for dist/public-api-annotated.json.",
            "  --version         Just the version string (e.g. 0.1.0-alpha.9).",
            "  --help, -h        Print this help.",
            "",
            "The pinned URLs are immune to the unpkg @latest CDN-lag window — the",
            "@${version} suffix targets the exact tarball on the registry.",
          ].join("\n") + "\n",
        );
        break;
      default:
        process.stderr.write(
          `resolve-latest-api: unknown option "${mode}" — run with --help\n`,
        );
        process.exit(2);
    }
  } catch (err) {
    process.stderr.write(
      `resolve-latest-api: ${(err && err.message) || err}\n`,
    );
    process.exit(1);
  }
}
