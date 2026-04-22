import { describe, it, expect, beforeEach, vi } from "vitest";
import { effect } from "../reactive.js";
// Imported from the internal path. Public import is `@whisq/core/persistence`
// (see packages/core/package.json exports).
import { persistedSignal } from "../persistence.js";

beforeEach(() => {
  window.localStorage.clear();
  window.sessionStorage.clear();
});

describe("persistedSignal() — initial load", () => {
  it("returns the initial value when storage is empty", () => {
    const s = persistedSignal("unset-key", 42);
    expect(s.value).toBe(42);
  });

  it("loads a previously persisted value on init", () => {
    window.localStorage.setItem("count", "7");
    const s = persistedSignal("count", 0);
    expect(s.value).toBe(7);
  });

  it("handles complex JSON values", () => {
    window.localStorage.setItem("todos", '[{"id":"a","done":true}]');
    const s = persistedSignal<Array<{ id: string; done: boolean }>>(
      "todos",
      [],
    );
    expect(s.value).toEqual([{ id: "a", done: true }]);
  });

  it("falls back to initial when stored JSON is malformed", () => {
    window.localStorage.setItem("bad", "{not json}");
    const s = persistedSignal("bad", { ok: true });
    expect(s.value).toEqual({ ok: true });
  });

  it("falls back to initial when schema throws", () => {
    window.localStorage.setItem("user", '{"name":"alice","age":"oops"}');
    const s = persistedSignal<{ name: string; age: number }>(
      "user",
      { name: "anon", age: 0 },
      {
        schema: (raw) => {
          const v = raw as { name: string; age: unknown };
          if (typeof v.age !== "number") throw new TypeError("age");
          return v as { name: string; age: number };
        },
      },
    );
    expect(s.value).toEqual({ name: "anon", age: 0 });
  });
});

describe("persistedSignal() — writes", () => {
  it("persists on .value assignment", async () => {
    const s = persistedSignal("writes", 0);
    s.value = 5;
    // effect is synchronous — storage updates immediately
    expect(window.localStorage.getItem("writes")).toBe("5");
  });

  it("persists on .update()", () => {
    const s = persistedSignal("counter", 10);
    s.update((n) => n + 1);
    expect(window.localStorage.getItem("counter")).toBe("11");
  });

  it("does not overwrite storage with the initial value on init (no-op first run)", () => {
    window.localStorage.setItem("existing", "99");
    persistedSignal("existing", 0); // should read 99, NOT write back 0
    expect(window.localStorage.getItem("existing")).toBe("99");
  });

  it("warns but does not throw when storage rejects the write", () => {
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
    const orig = Storage.prototype.setItem;
    Storage.prototype.setItem = function throwingSet() {
      throw new Error("QuotaExceededError");
    };
    try {
      const s = persistedSignal("quota", "a");
      expect(() => {
        s.value = "b";
      }).not.toThrow();
      expect(warn).toHaveBeenCalledWith(
        expect.stringContaining('failed to write "quota"'),
        expect.any(Error),
      );
      expect(s.value).toBe("b"); // in-memory value preserved
    } finally {
      Storage.prototype.setItem = orig;
      warn.mockRestore();
    }
  });
});

describe("persistedSignal() — sessionStorage", () => {
  it("routes to sessionStorage when storage: 'session'", () => {
    const s = persistedSignal("tab-state", "init", { storage: "session" });
    s.value = "changed";
    expect(window.sessionStorage.getItem("tab-state")).toBe('"changed"');
    expect(window.localStorage.getItem("tab-state")).toBeNull();
  });

  it("reads from sessionStorage on init", () => {
    window.sessionStorage.setItem("read-session", '"pre-existing"');
    const s = persistedSignal("read-session", "default", {
      storage: "session",
    });
    expect(s.value).toBe("pre-existing");
  });
});

describe("persistedSignal() — custom serialize/deserialize", () => {
  it("uses custom codecs for non-JSON values (Map)", () => {
    const initial = new Map<string, number>();
    const s = persistedSignal("map", initial, {
      serialize: (m) => JSON.stringify(Array.from(m.entries())),
      deserialize: (raw) => new Map<string, number>(JSON.parse(raw)),
    });

    s.value = new Map([
      ["a", 1],
      ["b", 2],
    ]);
    expect(window.localStorage.getItem("map")).toBe('[["a",1],["b",2]]');

    // Re-hydrate from the persisted value
    const loaded = persistedSignal("map", new Map<string, number>(), {
      serialize: (m) => JSON.stringify(Array.from(m.entries())),
      deserialize: (raw) => new Map<string, number>(JSON.parse(raw)),
    });
    expect(loaded.value.get("a")).toBe(1);
    expect(loaded.value.get("b")).toBe(2);
  });
});

describe("persistedSignal() — SSR safety", () => {
  it("returns a plain signal initialized to `initial` when window is undefined", () => {
    // Jsdom exposes `window` globally — hide it for this test.
    const originalWindow = globalThis.window;
    // @ts-expect-error intentional delete for SSR simulation
    delete (globalThis as { window?: Window }).window;
    try {
      const s = persistedSignal("ssr", { count: 0 });
      expect(s.value).toEqual({ count: 0 });
      // Writes don't throw even with no storage
      expect(() => {
        s.value = { count: 1 };
      }).not.toThrow();
      expect(s.value).toEqual({ count: 1 });
    } finally {
      globalThis.window = originalWindow;
    }
  });
});

describe("persistedSignal() — reactivity", () => {
  it("participates in effect tracking like a normal signal", () => {
    const s = persistedSignal("reactive", 0);
    const seen: number[] = [];
    effect(() => {
      seen.push(s.value);
    });
    s.value = 1;
    s.value = 2;
    expect(seen).toEqual([0, 1, 2]);
  });
});

describe("persistedSignal() — onSchemaFailure callback", () => {
  it("fires with the parse error and the raw string when JSON is malformed", () => {
    window.localStorage.setItem("bad-json", "{not json}");
    const onSchemaFailure = vi.fn();
    const s = persistedSignal("bad-json", { ok: true }, { onSchemaFailure });
    expect(s.value).toEqual({ ok: true });
    expect(onSchemaFailure).toHaveBeenCalledTimes(1);
    const [err, raw] = onSchemaFailure.mock.calls[0]!;
    expect(err).toBeInstanceOf(SyntaxError);
    expect(raw).toBe("{not json}");
  });

  it("fires with the schema error and the raw string when the validator throws", () => {
    const rawStored = '{"name":"alice","age":"oops"}';
    window.localStorage.setItem("bad-schema", rawStored);
    const onSchemaFailure = vi.fn();
    const s = persistedSignal<{ name: string; age: number }>(
      "bad-schema",
      { name: "anon", age: 0 },
      {
        schema: (raw) => {
          const v = raw as { name: string; age: unknown };
          if (typeof v.age !== "number") throw new TypeError("age");
          return v as { name: string; age: number };
        },
        onSchemaFailure,
      },
    );
    expect(s.value).toEqual({ name: "anon", age: 0 });
    expect(onSchemaFailure).toHaveBeenCalledTimes(1);
    const [err, raw] = onSchemaFailure.mock.calls[0]!;
    expect(err).toBeInstanceOf(TypeError);
    expect((err as Error).message).toBe("age");
    expect(raw).toBe(rawStored);
  });

  it("is NOT invoked on first visit (no stored value)", () => {
    const onSchemaFailure = vi.fn();
    const s = persistedSignal("first-visit", "default", { onSchemaFailure });
    expect(s.value).toBe("default");
    expect(onSchemaFailure).not.toHaveBeenCalled();
  });

  it("is NOT invoked on the happy path (well-formed JSON + schema accepts)", () => {
    window.localStorage.setItem("ok-json", '{"name":"alice","age":30}');
    const onSchemaFailure = vi.fn();
    const s = persistedSignal<{ name: string; age: number }>(
      "ok-json",
      { name: "anon", age: 0 },
      {
        schema: (raw) => raw as { name: string; age: number },
        onSchemaFailure,
      },
    );
    expect(s.value).toEqual({ name: "alice", age: 30 });
    expect(onSchemaFailure).not.toHaveBeenCalled();
  });

  it("is NOT invoked on storage-access errors (getItem throws)", () => {
    const onSchemaFailure = vi.fn();
    const originalGet = Storage.prototype.getItem;
    Storage.prototype.getItem = function throwingGet() {
      throw new Error("access denied");
    };
    try {
      const s = persistedSignal("storage-denied", "fallback", {
        onSchemaFailure,
      });
      expect(s.value).toBe("fallback");
      expect(onSchemaFailure).not.toHaveBeenCalled();
    } finally {
      Storage.prototype.getItem = originalGet;
    }
  });

  it("still falls back to initial when the callback itself throws", () => {
    window.localStorage.setItem("cb-throws", "{not json}");
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
    const onSchemaFailure = vi.fn(() => {
      throw new Error("logger exploded");
    });
    try {
      const s = persistedSignal("cb-throws", "initial", { onSchemaFailure });
      expect(s.value).toBe("initial");
      expect(onSchemaFailure).toHaveBeenCalledTimes(1);
      expect(warn).toHaveBeenCalledWith(
        expect.stringContaining(
          'persistedSignal: onSchemaFailure callback for "cb-throws" threw',
        ),
        expect.any(Error),
      );
    } finally {
      warn.mockRestore();
    }
  });
});
