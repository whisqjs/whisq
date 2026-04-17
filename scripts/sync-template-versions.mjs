#!/usr/bin/env node
// Rewrites every `@whisq/*` dep inside
// `packages/create-whisq/src/templates/**/package.json.tmpl`
// to match the current workspace version (the one in `packages/core/package.json`).
//
// Caret range is preserved. `workspace:*` specs are left alone.
// Run after version bumps so scaffolded apps pick up the new release.

import { readFileSync, readdirSync, statSync, writeFileSync } from "node:fs";
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

function walk(dir, out = []) {
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry);
    const s = statSync(full);
    if (s.isDirectory()) walk(full, out);
    else if (entry === "package.json.tmpl") out.push(full);
  }
  return out;
}

const templatesDir = join(root, "packages", "create-whisq", "src", "templates");
const files = walk(templatesDir);
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

console.log(`Synced ${changed}/${files.length} template(s) to @whisq/*@${targetVersion}.`);
