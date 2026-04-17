/**
 * Tree-shaking verification for @whisq/core
 *
 * Run: npx tsx packages/core/bench/tree-shake.ts
 *
 * Builds minimal imports with esbuild and verifies unused exports
 * are eliminated. Prints the size of each import combination.
 */

import { execFileSync } from "node:child_process";
import { writeFileSync, unlinkSync, readFileSync, statSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { gzipSync } from "node:zlib";

const cases: { name: string; code: string }[] = [
  {
    name: "signal only",
    code: `import { signal } from "./src/index.js"; const s = signal(0); console.log(s.value);`,
  },
  {
    name: "signal + computed + effect",
    code: `import { signal, computed, effect } from "./src/index.js"; const s = signal(0); const c = computed(() => s.value); effect(() => console.log(c.value));`,
  },
  {
    name: "signal + div + mount",
    code: `import { signal, div, mount } from "./src/index.js"; const s = signal(0); mount(div(() => s.value), document.body);`,
  },
  {
    name: "full app (signal + component + div + button + mount)",
    code: `import { signal, component, div, button, span, mount } from "./src/index.js"; const App = component(() => { const c = signal(0); return div(button({ onclick: () => c.value++ }, span(() => c.value))); }); mount(App({}), document.body);`,
  },
  {
    name: "everything (all exports)",
    code: `import * as w from "./src/index.js"; console.log(w);`,
  },
];

console.log("\n=== Tree-shaking Verification ===\n");
console.log(
  "  Import combination".padEnd(52),
  "Raw".padStart(8),
  "Gzipped".padStart(8),
);
console.log("  " + "-".repeat(66));

for (const { name, code } of cases) {
  const tmpFile = join(tmpdir(), `whisq-shake-${Date.now()}.ts`);
  const outFile = join(tmpdir(), `whisq-shake-${Date.now()}.js`);

  try {
    writeFileSync(tmpFile, code);
    execFileSync(
      "npx",
      [
        "esbuild",
        tmpFile,
        "--bundle",
        "--minify",
        "--format=esm",
        `--outfile=${outFile}`,
        "--platform=browser",
        "--external:jsdom",
      ],
      { cwd: join(import.meta.dirname, ".."), stdio: "pipe" },
    );

    const raw = statSync(outFile).size;
    const content = readFileSync(outFile);
    const gzipped = gzipSync(content).length;

    console.log(
      `  ${name.padEnd(50)} ${(raw / 1024).toFixed(1).padStart(6)} KB ${(gzipped / 1024).toFixed(1).padStart(6)} KB`,
    );

    unlinkSync(outFile);
  } catch (e: any) {
    console.log(`  ${name.padEnd(50)} ERROR: ${e.message?.split("\n")[0]}`);
  } finally {
    try {
      unlinkSync(tmpFile);
    } catch {}
  }
}

console.log("\n=== Done ===\n");
