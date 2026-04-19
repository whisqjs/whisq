import { describe, it, expect, beforeAll } from "vitest";
import { readFileSync, existsSync } from "node:fs";
import { execFileSync } from "node:child_process";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";
// @ts-expect-error — .mjs module without type declarations
import {
  extractExports,
  generateManifest,
} from "../../scripts/generate-public-api.mjs";

const __dirname = dirname(fileURLToPath(import.meta.url));
const pkgRoot = resolve(__dirname, "../..");

describe("extractExports()", () => {
  it("extracts value re-exports", () => {
    const src = `export { signal, computed } from "./reactive.js";`;
    expect(extractExports(src)).toEqual(["computed", "signal"]);
  });

  it("extracts type re-exports", () => {
    const src = `export type { Signal, ReadonlySignal } from "./reactive.js";`;
    expect(extractExports(src)).toEqual(["ReadonlySignal", "Signal"]);
  });

  it("resolves `as` aliases to the exported name", () => {
    const src = `export { internal as publicName } from "./x.js";`;
    expect(extractExports(src)).toEqual(["publicName"]);
  });

  it("handles multi-line export blocks", () => {
    const src = `
      export {
        h,
        raw,
        when,
        each,
      } from "./elements.js";
    `;
    expect(extractExports(src)).toEqual(["each", "h", "raw", "when"]);
  });

  it("deduplicates names that appear more than once", () => {
    const src = `
      export { foo } from "./a.js";
      export type { foo } from "./b.js";
    `;
    expect(extractExports(src)).toEqual(["foo"]);
  });

  it("ignores commented-out re-export statements", () => {
    const src = `
      // export { ghost } from "./nope.js";
      export { real } from "./x.js";
    `;
    expect(extractExports(src)).toEqual(["real"]);
  });

  it("ignores in-block // comments without swallowing the following name", () => {
    const src = `
      export {
        // Core
        h,
        raw,
      } from "./elements.js";
    `;
    expect(extractExports(src)).toEqual(["h", "raw"]);
  });

  it("extracts canonical exports from the real src/index.ts", () => {
    const src = readFileSync(resolve(pkgRoot, "src/index.ts"), "utf8");
    const exports = extractExports(src);

    // Sanity: substantial surface
    expect(exports.length).toBeGreaterThan(30);

    // Sorted
    expect(exports).toEqual([...exports].sort());

    // Key public surface must be present
    for (const name of [
      "signal",
      "computed",
      "effect",
      "batch",
      "component",
      "mount",
      "resource",
      "ref",
      "bind",
      "Resource",
      "Signal",
    ]) {
      expect(exports).toContain(name);
    }
  });
});

describe("generateManifest()", () => {
  it("returns version and sorted exports", () => {
    const manifest = generateManifest(
      "1.2.3",
      `export { b, a } from "./x.js"; export type { C } from "./y.js";`,
    );
    expect(manifest).toEqual({
      version: "1.2.3",
      exports: ["C", "a", "b"],
    });
  });
});

describe("generate-public-api.mjs CLI", () => {
  const outPath = resolve(pkgRoot, "dist/public-api.json");

  beforeAll(() => {
    execFileSync(
      "node",
      [resolve(pkgRoot, "scripts/generate-public-api.mjs")],
      { stdio: "pipe" },
    );
  });

  it("writes dist/public-api.json", () => {
    expect(existsSync(outPath)).toBe(true);
  });

  it("writes valid JSON with version and exports fields", () => {
    const manifest = JSON.parse(readFileSync(outPath, "utf8"));
    expect(manifest).toHaveProperty("version");
    expect(typeof manifest.version).toBe("string");
    expect(manifest).toHaveProperty("exports");
    expect(Array.isArray(manifest.exports)).toBe(true);
    expect(manifest.exports.length).toBeGreaterThan(30);
  });

  it("version matches package.json", () => {
    const manifest = JSON.parse(readFileSync(outPath, "utf8"));
    const pkg = JSON.parse(
      readFileSync(resolve(pkgRoot, "package.json"), "utf8"),
    );
    expect(manifest.version).toBe(pkg.version);
  });

  it("exports are sorted and unique", () => {
    const manifest = JSON.parse(readFileSync(outPath, "utf8"));
    const sorted = [...manifest.exports].sort();
    expect(manifest.exports).toEqual(sorted);
    expect(new Set(manifest.exports).size).toBe(manifest.exports.length);
  });
});
