import { describe, it, expect, vi } from "vitest";
// @ts-expect-error — plain .mjs tooling script; no .d.ts emitted.
import {
  pinnedPublicApiUrl,
  pinnedAnnotatedApiUrl,
  extractVersion,
  resolveLatestVersion,
} from "../../scripts/resolve-latest-api.mjs";

describe("pinnedPublicApiUrl", () => {
  it("targets the exact version's tarball on unpkg", () => {
    expect(pinnedPublicApiUrl("0.1.0-alpha.9")).toBe(
      "https://unpkg.com/@whisq/core@0.1.0-alpha.9/dist/public-api.json",
    );
  });

  it("percent-encodes versions that contain characters (defensive; semver rarely does)", () => {
    expect(pinnedPublicApiUrl("0.2.0-rc.1+build.42")).toBe(
      "https://unpkg.com/@whisq/core@0.2.0-rc.1%2Bbuild.42/dist/public-api.json",
    );
  });

  it("accepts a custom package name", () => {
    expect(pinnedPublicApiUrl("1.0.0", "@whisq/other")).toBe(
      "https://unpkg.com/@whisq/other@1.0.0/dist/public-api.json",
    );
  });

  it("rejects an empty version", () => {
    expect(() => pinnedPublicApiUrl("")).toThrow(TypeError);
  });
});

describe("pinnedAnnotatedApiUrl", () => {
  it("targets the enriched manifest file at the pinned version", () => {
    expect(pinnedAnnotatedApiUrl("0.1.0-alpha.9")).toBe(
      "https://unpkg.com/@whisq/core@0.1.0-alpha.9/dist/public-api-annotated.json",
    );
  });
});

describe("extractVersion", () => {
  it("returns the version string from a well-formed registry payload", () => {
    expect(extractVersion({ version: "0.1.0-alpha.9", name: "@whisq/core" }))
      .toBe("0.1.0-alpha.9");
  });

  it("throws on a non-object payload", () => {
    expect(() => extractVersion(null)).toThrow(TypeError);
    expect(() => extractVersion("0.1.0")).toThrow(TypeError);
  });

  it("throws when version is missing / not a string / empty", () => {
    expect(() => extractVersion({})).toThrow(/version/);
    expect(() => extractVersion({ version: 9 })).toThrow(/version/);
    expect(() => extractVersion({ version: "" })).toThrow(/version/);
  });
});

describe("resolveLatestVersion", () => {
  it("fetches the registry URL and returns the version", async () => {
    const fetchImpl = vi.fn(async () => ({
      ok: true,
      status: 200,
      json: async () => ({ version: "1.2.3", name: "@whisq/core" }),
    }));
    const version = await resolveLatestVersion({ fetch: fetchImpl });
    expect(version).toBe("1.2.3");
    expect(fetchImpl).toHaveBeenCalledWith(
      "https://registry.npmjs.org/@whisq/core/latest",
    );
  });

  it("honours a custom registryUrl (useful for mocking)", async () => {
    const fetchImpl = vi.fn(async () => ({
      ok: true,
      status: 200,
      json: async () => ({ version: "2.0.0" }),
    }));
    await resolveLatestVersion({
      fetch: fetchImpl,
      registryUrl: "https://example.test/@whisq%2Fcore/latest",
    });
    expect(fetchImpl).toHaveBeenCalledWith(
      "https://example.test/@whisq%2Fcore/latest",
    );
  });

  it("throws a context-rich error on non-2xx responses", async () => {
    const fetchImpl = vi.fn(async () => ({
      ok: false,
      status: 503,
      json: async () => ({}),
    }));
    await expect(
      resolveLatestVersion({ fetch: fetchImpl }),
    ).rejects.toThrow(/503/);
  });

  it("throws when no fetch implementation is available", async () => {
    await expect(
      // @ts-expect-error — intentionally passing a non-function
      resolveLatestVersion({ fetch: null }),
    ).rejects.toThrow(/fetch/i);
  });
});
