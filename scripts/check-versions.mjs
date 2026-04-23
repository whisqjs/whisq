#!/usr/bin/env node
// Verifies version consistency across the monorepo:
//   1. Every `@whisq/*` package AND `create-whisq` in `packages/*` share the same version.
//   2. Every `@whisq/*` reference inside
//      `packages/create-whisq/src/templates/**/package.json.tmpl` resolves to
//      that same version. Allowed forms: "X.Y.Z", "^X.Y.Z", "~X.Y.Z", "workspace:*".
//   3. Every `@whisq/*` reference inside `examples/*/package.json` (real
//      runnable StackBlitz templates) follows the same rule.
//
// `create-whisq` is included so the scaffolder and the runtime packages
// always release together. Enforced by the `fixed` group in
// `.changeset/config.json` and by this check in CI + /release.
//
// Exits non-zero on any drift. Run in CI and as a gate inside /release.

import { existsSync, readFileSync, readdirSync, statSync } from "node:fs";
import { join, relative } from "node:path";
import { fileURLToPath } from "node:url";

const root = fileURLToPath(new URL("..", import.meta.url));
const errors = [];

const RELEASED_PACKAGE_NAMES = new Set(["create-whisq"]);
const isReleasedPackage = (name) =>
  Boolean(name) && (name.startsWith("@whisq/") || RELEASED_PACKAGE_NAMES.has(name));

const releasedPackages = readdirSync(join(root, "packages"))
  .map((dir) => {
    const pkgPath = join(root, "packages", dir, "package.json");
    try {
      const pkg = JSON.parse(readFileSync(pkgPath, "utf8"));
      return { dir, pkgPath, name: pkg.name, version: pkg.version };
    } catch {
      return null;
    }
  })
  .filter((p) => p && isReleasedPackage(p.name));

if (releasedPackages.length === 0) {
  errors.push("No released packages found in packages/*");
}

const referenceVersion = releasedPackages[0]?.version;
for (const pkg of releasedPackages) {
  if (pkg.version !== referenceVersion) {
    errors.push(
      `${pkg.name} is ${pkg.version}, expected ${referenceVersion} (matching ${releasedPackages[0].name})`,
    );
  }
}

function walk(dir, matcher, out = []) {
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry);
    const s = statSync(full);
    if (s.isDirectory()) {
      if (entry === "node_modules" || entry === "dist") continue;
      walk(full, matcher, out);
    } else if (matcher(entry, full)) {
      out.push(full);
    }
  }
  return out;
}

const templatesDir = join(root, "packages", "create-whisq", "src", "templates");
let templateFiles = [];
try {
  templateFiles = walk(templatesDir, (name) => name === "package.json.tmpl");
} catch {
  errors.push(`Templates directory not found at ${relative(root, templatesDir)}`);
}

// Examples dir is optional — not every repo snapshot has runnable examples.
const examplesDir = join(root, "examples");
let exampleFiles = [];
if (existsSync(examplesDir)) {
  try {
    exampleFiles = walk(examplesDir, (name) => name === "package.json");
  } catch {
    errors.push(`Examples directory walk failed at ${relative(root, examplesDir)}`);
  }
}

const validSpec = (spec) => {
  if (spec === "workspace:*") return true;
  const stripped = spec.replace(/^[\^~]/, "");
  return stripped === referenceVersion;
};

function checkFile(file) {
  let pkg;
  try {
    pkg = JSON.parse(readFileSync(file, "utf8"));
  } catch (e) {
    errors.push(`${relative(root, file)} is not valid JSON: ${e.message}`);
    return;
  }
  for (const section of ["dependencies", "devDependencies", "peerDependencies"]) {
    const deps = pkg[section] ?? {};
    for (const [name, spec] of Object.entries(deps)) {
      if (!name.startsWith("@whisq/")) continue;
      if (!validSpec(spec)) {
        errors.push(
          `${relative(root, file)} ${section}["${name}"] is "${spec}", expected "^${referenceVersion}" or "${referenceVersion}"`,
        );
      }
    }
  }
}

for (const file of templateFiles) checkFile(file);
for (const file of exampleFiles) checkFile(file);

if (errors.length > 0) {
  console.error("Version consistency check failed:");
  for (const err of errors) console.error(`  - ${err}`);
  process.exit(1);
}

console.log(
  `Version consistency OK — ${releasedPackages.length} released packages at ${referenceVersion}, ${templateFiles.length} template(s) + ${exampleFiles.length} example(s) aligned.`,
);
