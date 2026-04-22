import { describe, it, expect, vi } from "vitest";
// Internal import path. Public API is `@whisq/core/ids` (see
// packages/core/package.json exports).
import { randomId } from "../ids.js";

const V4_UUID_SHAPE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

describe("randomId() — primary path (crypto.randomUUID)", () => {
  it("returns a string", () => {
    expect(typeof randomId()).toBe("string");
  });

  it("returns a UUID-v4-shaped string", () => {
    const id = randomId();
    expect(id).toMatch(V4_UUID_SHAPE);
  });

  it("returns different values on successive calls", () => {
    const a = randomId();
    const b = randomId();
    expect(a).not.toBe(b);
  });

  it("uses crypto.randomUUID when available", () => {
    const spy = vi
      .spyOn(crypto, "randomUUID")
      .mockReturnValue("00000000-0000-4000-8000-000000000000");
    try {
      const id = randomId();
      expect(spy).toHaveBeenCalledTimes(1);
      expect(id).toBe("00000000-0000-4000-8000-000000000000");
    } finally {
      spy.mockRestore();
    }
  });
});

describe("randomId() — fallback path (crypto.randomUUID unavailable)", () => {
  function withoutRandomUUID<T>(fn: () => T): T {
    const original = (crypto as { randomUUID?: () => string }).randomUUID;
    (crypto as { randomUUID?: () => string }).randomUUID = undefined;
    try {
      return fn();
    } finally {
      (crypto as { randomUUID?: () => string }).randomUUID = original;
    }
  }

  it("still returns a UUID-v4-shaped string", () => {
    const id = withoutRandomUUID(() => randomId());
    expect(id).toMatch(V4_UUID_SHAPE);
  });

  it("still returns different values on successive calls", () => {
    const [a, b, c] = withoutRandomUUID(() => [
      randomId(),
      randomId(),
      randomId(),
    ]);
    expect(new Set([a, b, c]).size).toBe(3);
  });

  it("does not throw when both crypto.randomUUID and global crypto are absent", () => {
    const originalCrypto = globalThis.crypto;
    // @ts-expect-error intentional delete — simulate pre-Web-Crypto env
    delete (globalThis as { crypto?: Crypto }).crypto;
    try {
      expect(() => randomId()).not.toThrow();
      const id = randomId();
      expect(id).toMatch(V4_UUID_SHAPE);
    } finally {
      globalThis.crypto = originalCrypto;
    }
  });
});
