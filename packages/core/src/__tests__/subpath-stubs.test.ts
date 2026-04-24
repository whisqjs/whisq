import { describe, it, expect } from "vitest";
import {
  partition,
  signalMap,
  signalSet,
  randomId,
  persistedSignal,
  bindPath,
} from "../index.js";

describe("sub-path stubs on @whisq/core main entry", () => {
  const cases: Array<{
    name: string;
    stub: unknown;
    subpath: string;
    slug: string;
  }> = [
    { name: "partition", stub: partition, subpath: "collections", slug: "partition" },
    { name: "signalMap", stub: signalMap, subpath: "collections", slug: "signalmap" },
    { name: "signalSet", stub: signalSet, subpath: "collections", slug: "signalset" },
    { name: "randomId", stub: randomId, subpath: "ids", slug: "randomid" },
    { name: "persistedSignal", stub: persistedSignal, subpath: "persistence", slug: "persistedsignal" },
    { name: "bindPath", stub: bindPath, subpath: "forms", slug: "bindpath" },
  ];

  for (const { name, stub, subpath, slug } of cases) {
    describe(`"${name}" stub`, () => {
      it("is callable (a function, not undefined)", () => {
        expect(typeof stub).toBe("function");
      });

      it("throws an Error when invoked", () => {
        expect(() => (stub as () => unknown)()).toThrow(Error);
      });

      it(`points to the @whisq/core/${subpath} sub-path in the error message`, () => {
        try {
          (stub as () => unknown)();
        } catch (err) {
          expect(err).toBeInstanceOf(Error);
          expect((err as Error).message).toContain(`@whisq/core/${subpath}`);
          expect((err as Error).message).toContain(name);
          expect((err as Error).message).toContain(
            `https://whisq.dev/api/${slug}/`,
          );
          return;
        }
        throw new Error("stub did not throw");
      });
    });
  }

  it("sub-path imports still resolve the real implementations (not the stubs)", async () => {
    const collections = await import("../collections.js");
    const ids = await import("../ids.js");
    const persistence = await import("../persistence.js");
    const forms = await import("../forms.js");

    expect(typeof collections.partition).toBe("function");
    expect(typeof collections.signalMap).toBe("function");
    expect(typeof collections.signalSet).toBe("function");
    expect(typeof ids.randomId).toBe("function");
    expect(typeof persistence.persistedSignal).toBe("function");
    expect(typeof forms.bindPath).toBe("function");

    // sanity: the sub-path randomId returns a real v4-shaped string, not a thrown error
    expect(ids.randomId()).toMatch(
      /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/,
    );
  });

  it("sub-path stub is distinct from the real implementation (main-path stub ≠ sub-path impl)", async () => {
    const ids = await import("../ids.js");
    expect(randomId).not.toBe(ids.randomId);
  });
});
