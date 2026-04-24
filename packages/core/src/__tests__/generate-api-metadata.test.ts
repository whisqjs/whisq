import { describe, it, expect } from "vitest";
// @ts-expect-error — .mjs build script exports plain JS; typechecker can't see types.
import {
  validateSymbolEntry,
  buildAnnotatedManifest,
} from "../../scripts/generate-api-metadata.mjs";

const exportNames = new Set([
  "signal",
  "computed",
  "effect",
  "batch",
  "div",
]);

function validEntry(overrides: Partial<Record<string, unknown>> = {}): Record<string, unknown> {
  return {
    name: "signal",
    kind: "function",
    signature: "signal<T>(initial: T): Signal<T>",
    summary: "Create a reactive value.",
    gotchas: [],
    examples: [],
    since: "0.1.0-alpha.1",
    seeAlso: ["computed", "effect"],
    topic: "signals",
    ...overrides,
  };
}

describe("validateSymbolEntry", () => {
  it("accepts a well-formed entry with no errors", () => {
    const errs = validateSymbolEntry(validEntry(), exportNames);
    expect(errs).toEqual([]);
  });

  it("reports missing required fields", () => {
    const errs = validateSymbolEntry({ name: "signal" }, exportNames);
    expect(errs.some((e: string) => e.includes("kind"))).toBe(true);
    expect(errs.some((e: string) => e.includes("signature"))).toBe(true);
    expect(errs.some((e: string) => e.includes("summary"))).toBe(true);
  });

  it("rejects unknown kinds", () => {
    const errs = validateSymbolEntry(
      validEntry({ kind: "widget" }),
      exportNames,
    );
    expect(errs.some((e: string) => e.includes("kind"))).toBe(true);
  });

  it("rejects arrays that contain non-strings", () => {
    const errs = validateSymbolEntry(
      validEntry({ gotchas: ["ok", 42] }),
      exportNames,
    );
    expect(errs.some((e: string) => e.includes("gotchas"))).toBe(true);
  });

  it("fails drift when name is not a known export", () => {
    const errs = validateSymbolEntry(
      validEntry({ name: "doesNotExist" }),
      exportNames,
    );
    expect(errs.some((e: string) => e.includes("drift"))).toBe(true);
  });

  it("fails drift when a seeAlso reference is not a known export", () => {
    const errs = validateSymbolEntry(
      validEntry({ seeAlso: ["signal", "ghostSymbol"] }),
      exportNames,
    );
    expect(errs.some((e: string) => e.includes("ghostSymbol"))).toBe(true);
    expect(errs.some((e: string) => e.includes("drift"))).toBe(true);
  });
});

describe("buildAnnotatedManifest", () => {
  it("returns ok + stamps version + sorts symbols alphabetically", () => {
    const result = buildAnnotatedManifest({
      version: "9.9.9",
      exports: [...exportNames],
      enrichment: {
        schemaVersion: 1,
        symbols: [validEntry({ name: "effect" }), validEntry({ name: "batch" })],
      },
    });
    expect(result.ok).toBe(true);
    expect(result.manifest.version).toBe("9.9.9");
    expect(result.manifest.schemaVersion).toBe(1);
    expect(result.manifest.symbols.map((s: { name: string }) => s.name)).toEqual([
      "batch",
      "effect",
    ]);
  });

  it("aggregates per-entry validation errors and labels them", () => {
    const result = buildAnnotatedManifest({
      version: "1.0.0",
      exports: [...exportNames],
      enrichment: {
        schemaVersion: 1,
        symbols: [
          validEntry({ name: "nope" }), // drift
          validEntry({ kind: "widget" }), // invalid kind
        ],
      },
    });
    expect(result.ok).toBe(false);
    expect(result.errors.some((e: string) => e.startsWith("[nope]"))).toBe(true);
    expect(result.errors.some((e: string) => e.startsWith("[signal]"))).toBe(true);
  });

  it("rejects a wrong schemaVersion at the top level", () => {
    const result = buildAnnotatedManifest({
      version: "1.0.0",
      exports: [...exportNames],
      enrichment: { schemaVersion: 999, symbols: [validEntry()] },
    });
    expect(result.ok).toBe(false);
    expect(result.errors.some((e: string) => e.includes("schemaVersion"))).toBe(
      true,
    );
  });

  it("flags duplicate symbol entries", () => {
    const result = buildAnnotatedManifest({
      version: "1.0.0",
      exports: [...exportNames],
      enrichment: {
        schemaVersion: 1,
        symbols: [validEntry({ name: "signal" }), validEntry({ name: "signal" })],
      },
    });
    expect(result.ok).toBe(false);
    expect(result.errors.some((e: string) => e.includes("duplicate"))).toBe(
      true,
    );
  });
});
