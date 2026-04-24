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

describe("randomId({ prefix })", () => {
  it("prepends the prefix to the UUID with no separator", () => {
    const id = randomId({ prefix: "todo_" });
    expect(id.startsWith("todo_")).toBe(true);
    expect(id.slice("todo_".length)).toMatch(V4_UUID_SHAPE);
  });

  it("empty prefix is a no-op (same shape as zero-arg call)", () => {
    expect(randomId({ prefix: "" })).toMatch(V4_UUID_SHAPE);
  });
});

describe("randomId({ rng })", () => {
  it("produces deterministic output when rng is deterministic", () => {
    const seeded = () => 0.5;
    const a = randomId({ rng: seeded });
    const b = randomId({ rng: seeded });
    expect(a).toBe(b);
    expect(a).toMatch(V4_UUID_SHAPE);
  });

  it("bypasses crypto.randomUUID when rng is supplied (the whole point)", () => {
    const cryptoSpy = vi.spyOn(crypto, "randomUUID");
    try {
      const rng = () => 0.25;
      randomId({ rng });
      expect(cryptoSpy).not.toHaveBeenCalled();
    } finally {
      cryptoSpy.mockRestore();
    }
  });

  it("respects both prefix and rng together", () => {
    const id = randomId({ prefix: "t-", rng: () => 0 });
    expect(id).toBe("t-00000000-0000-4000-8000-000000000000");
  });

  it("degenerate () => 0 rng produces the all-zero UUID (sanity / shape check)", () => {
    expect(randomId({ rng: () => 0 })).toBe(
      "00000000-0000-4000-8000-000000000000",
    );
  });

  it("different rng functions may yield different sequences across calls", () => {
    let i = 0;
    const stepping = () => {
      // feed 0, 1/16, 2/16, ... — each call advances, so successive calls differ
      const n = (i % 16) / 16;
      i += 1;
      return n;
    };
    const a = randomId({ rng: stepping });
    const b = randomId({ rng: stepping });
    expect(a).not.toBe(b);
    expect(a).toMatch(V4_UUID_SHAPE);
    expect(b).toMatch(V4_UUID_SHAPE);
  });
});
