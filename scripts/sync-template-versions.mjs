#!/usr/bin/env node
// Rewrites every `@whisq/*` dep in two places to match the current workspace
// version (the one in `packages/core/package.json`):
//
//   1. `packages/create-whisq/src/templates/**/package.json.tmpl` — the
//      templates the CLI scaffolds from.
//   2. `examples/*/package.json` — StackBlitz-runnable example apps that
//      must pin to the latest release so `npm install` on StackBlitz
//      resolves to something that works.
//
// Caret range is preserved. `workspace:*` specs are left alone.
// Run after version bumps so scaffolded apps + examples pick up the new
// release.

import { existsSync, readFileSync, readdirSync, statSync, writeFileSync } from "node:fs";
import { join, relative } from "node:path";
import { fileURLToPath } from "node:url";

const root = fileURLToPath(new URL("..", import.meta.url));

const corePkg = JSON.parse(
  readFileSync(join(root, "packages", "core", "package.json"), "utf8"),
);
const targetVersion = corePkg.version;
if (!targetVersion) {
  console.error("Could not read version from packages/core/package.json");
  process.exit(1);
}

function walk(dir, matcher, out = []) {
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry);
    const s = statSync(full);
    if (s.isDirectory()) {
      // Skip node_modules inside examples — they can exist after a local
      // `npm install` and we don't want to rewrite vendored files.
      if (entry === "node_modules" || entry === "dist") continue;
      walk(full, matcher, out);
    } else if (matcher(entry, full)) {
      out.push(full);
    }
  }
  return out;
}

const templatesDir = join(root, "packages", "create-whisq", "src", "templates");
const examplesDir = join(root, "examples");

const files = [
  ...walk(templatesDir, (name) => name === "package.json.tmpl"),
  ...(existsSync(examplesDir)
    ? walk(examplesDir, (name) => name === "package.json")
    : []),
];
let changed = 0;

for (const file of files) {
  const original = readFileSync(file, "utf8");
  const pkg = JSON.parse(original);
  let mutated = false;

  for (const section of ["dependencies", "devDependencies", "peerDependencies"]) {
    const deps = pkg[section];
    if (!deps) continue;
    for (const [name, spec] of Object.entries(deps)) {
      if (!name.startsWith("@whisq/")) continue;
      if (spec === "workspace:*") continue;
      const prefix = spec.startsWith("^") || spec.startsWith("~") ? spec[0] : "^";
      const next = `${prefix}${targetVersion}`;
      if (next !== spec) {
        deps[name] = next;
        mutated = true;
      }
    }
  }

  if (mutated) {
    const trailingNewline = original.endsWith("\n") ? "\n" : "";
    writeFileSync(file, JSON.stringify(pkg, null, 2) + trailingNewline);
    console.log(`updated ${relative(root, file)}`);
    changed++;
  }
}

console.log(
  `Synced ${changed}/${files.length} template/example file(s) to @whisq/*@${targetVersion}.`,
);
