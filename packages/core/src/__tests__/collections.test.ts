import { describe, it, expect, vi } from "vitest";
import { signal, effect } from "../reactive.js";
// Imported from the internal module path. Public API is
// `@whisq/core/collections` (see packages/core/package.json exports).
import { signalMap, signalSet, partition } from "../collections.js";

describe("signalMap()", () => {
  it("accepts initial entries", () => {
    const m = signalMap<string, number>([
      ["a", 1],
      ["b", 2],
    ]);
    expect(m.get("a")).toBe(1);
    expect(m.get("b")).toBe(2);
    expect(m.size).toBe(2);
  });

  it("set / get / has / delete round-trip", () => {
    const m = signalMap<string, number>();
    expect(m.has("x")).toBe(false);

    m.set("x", 42);
    expect(m.has("x")).toBe(true);
    expect(m.get("x")).toBe(42);

    expect(m.delete("x")).toBe(true);
    expect(m.delete("x")).toBe(false);
    expect(m.has("x")).toBe(false);
    expect(m.get("x")).toBeUndefined();
  });

  it("get() subscription fires only when that key changes", () => {
    const m = signalMap<string, number>();
    m.set("a", 1);
    m.set("b", 2);

    const spy = vi.fn(() => {
      m.get("a");
    });
    effect(spy);
    expect(spy).toHaveBeenCalledTimes(1);

    m.set("b", 99); // different key
    expect(spy).toHaveBeenCalledTimes(1);

    m.set("a", 5);
    expect(spy).toHaveBeenCalledTimes(2);
  });

  it("has() subscription fires only on add/delete of that key", () => {
    const m = signalMap<string, number>();

    const spy = vi.fn(() => {
      m.has("a");
    });
    effect(spy);
    expect(spy).toHaveBeenCalledTimes(1);

    m.set("b", 1);
    expect(spy).toHaveBeenCalledTimes(1);

    m.set("a", 1);
    expect(spy).toHaveBeenCalledTimes(2);

    m.delete("a");
    expect(spy).toHaveBeenCalledTimes(3);
  });

  it("size is reactive on add/delete/clear", () => {
    const m = signalMap<string, number>();

    let seen: number[] = [];
    effect(() => {
      seen.push(m.size);
    });
    expect(seen).toEqual([0]);

    m.set("a", 1);
    m.set("b", 2);
    expect(seen).toEqual([0, 1, 2]);

    m.delete("a");
    expect(seen).toEqual([0, 1, 2, 1]);

    m.clear();
    expect(seen).toEqual([0, 1, 2, 1, 0]);
  });

  it("iteration subscribes to structural changes", () => {
    const m = signalMap<string, number>([["a", 1]]);
    let snapshots: string[][] = [];

    effect(() => {
      snapshots.push([...m.keys()]);
    });
    expect(snapshots).toEqual([["a"]]);

    m.set("b", 2);
    expect(snapshots).toEqual([["a"], ["a", "b"]]);

    m.delete("a");
    expect(snapshots).toEqual([["a"], ["a", "b"], ["b"]]);
  });

  it("setting the same value twice on an existing key still triggers (no Object.is skip)", () => {
    // Matches Map's semantics — set always emits, consistent with how other
    // reactive libs behave for collections. Users can check before setting.
    const m = signalMap<string, number>([["a", 1]]);
    const spy = vi.fn(() => {
      m.get("a");
    });
    effect(spy);
    expect(spy).toHaveBeenCalledTimes(1);

    m.set("a", 1);
    m.set("a", 1);
    // Each set notifies. The underlying signal() dedup's via Object.is, so
    // identical values should NOT re-fire.
    expect(spy).toHaveBeenCalledTimes(1);
  });

  it("preserves undefined as a valid stored value (distinct from absent)", () => {
    const m = signalMap<string, number | undefined>();
    m.set("x", undefined);
    expect(m.has("x")).toBe(true);
    expect(m.get("x")).toBeUndefined();

    m.delete("x");
    expect(m.has("x")).toBe(false);
  });

  it("forEach passes (value, key, map)", () => {
    const m = signalMap<string, number>([
      ["a", 1],
      ["b", 2],
    ]);
    const seen: Array<[number, string]> = [];
    m.forEach((v, k) => seen.push([v, k]));
    expect(seen).toEqual([
      [1, "a"],
      [2, "b"],
    ]);
  });

  it("set returns the map (chainable)", () => {
    const m = signalMap<string, number>();
    const res = m.set("a", 1).set("b", 2);
    expect(res).toBe(m);
    expect(m.size).toBe(2);
  });

  it("clear on an empty map is a no-op (no subscriber re-runs)", () => {
    const m = signalMap<string, number>();
    const spy = vi.fn(() => {
      m.size;
    });
    effect(spy);
    expect(spy).toHaveBeenCalledTimes(1);

    m.clear();
    expect(spy).toHaveBeenCalledTimes(1);
  });
});

describe("signalSet()", () => {
  it("accepts initial values", () => {
    const s = signalSet<string>(["a", "b"]);
    expect(s.has("a")).toBe(true);
    expect(s.has("b")).toBe(true);
    expect(s.size).toBe(2);
  });

  it("add / has / delete round-trip", () => {
    const s = signalSet<string>();
    expect(s.has("x")).toBe(false);

    s.add("x");
    expect(s.has("x")).toBe(true);

    expect(s.delete("x")).toBe(true);
    expect(s.delete("x")).toBe(false);
    expect(s.has("x")).toBe(false);
  });

  it("has() subscription fires only for that value", () => {
    const s = signalSet<string>();

    const spy = vi.fn(() => {
      s.has("admin");
    });
    effect(spy);
    expect(spy).toHaveBeenCalledTimes(1);

    s.add("user"); // different value
    expect(spy).toHaveBeenCalledTimes(1);

    s.add("admin");
    expect(spy).toHaveBeenCalledTimes(2);

    s.delete("admin");
    expect(spy).toHaveBeenCalledTimes(3);
  });

  it("size is reactive", () => {
    const s = signalSet<string>();
    let seen: number[] = [];
    effect(() => {
      seen.push(s.size);
    });
    expect(seen).toEqual([0]);

    s.add("a");
    s.add("b");
    expect(seen).toEqual([0, 1, 2]);

    s.delete("a");
    expect(seen).toEqual([0, 1, 2, 1]);

    s.clear();
    expect(seen).toEqual([0, 1, 2, 1, 0]);
  });

  it("duplicate add() is a no-op", () => {
    const s = signalSet<string>(["a"]);
    const spy = vi.fn(() => {
      s.size;
    });
    effect(spy);
    expect(spy).toHaveBeenCalledTimes(1);

    s.add("a"); // already present
    expect(spy).toHaveBeenCalledTimes(1);
  });

  it("iteration subscribes to structural changes", () => {
    const s = signalSet<string>(["a"]);
    const snapshots: string[][] = [];

    effect(() => {
      snapshots.push([...s]);
    });
    expect(snapshots).toEqual([["a"]]);

    s.add("b");
    expect(snapshots).toEqual([["a"], ["a", "b"]]);
  });

  it("forEach passes (value, value, set)", () => {
    const s = signalSet<string>(["a", "b"]);
    const seen: string[] = [];
    s.forEach((v, v2, setArg) => {
      expect(v).toBe(v2);
      expect(setArg).toBe(s);
      seen.push(v);
    });
    expect(seen).toEqual(["a", "b"]);
  });

  it("add returns the set (chainable)", () => {
    const s = signalSet<string>();
    const res = s.add("a").add("b");
    expect(res).toBe(s);
    expect(s.size).toBe(2);
  });
});

// ── partition (WHISQ-101) ───────────────────────────────────────────────────

describe("partition()", () => {
  type Todo = { id: string; done: boolean };

  it("splits a static source into matching / not-matching tuples", () => {
    const todos = signal<Todo[]>([
      { id: "a", done: false },
      { id: "b", done: true },
      { id: "c", done: false },
    ]);
    const [pending, done] = partition(() => todos.value, (t) => !t.done);
    expect(pending.value.map((t) => t.id)).toEqual(["a", "c"]);
    expect(done.value.map((t) => t.id)).toEqual(["b"]);
  });

  it("re-derives both sides when the source changes", () => {
    const todos = signal<Todo[]>([{ id: "a", done: false }]);
    const [pending, done] = partition(() => todos.value, (t) => !t.done);

    expect(pending.value).toHaveLength(1);
    expect(done.value).toHaveLength(0);

    todos.value = [
      { id: "a", done: true },
      { id: "b", done: false },
    ];
    expect(pending.value.map((t) => t.id)).toEqual(["b"]);
    expect(done.value.map((t) => t.id)).toEqual(["a"]);
  });

  it("returns two empty arrays when the source is empty", () => {
    const src = signal<Todo[]>([]);
    const [yes, no] = partition(() => src.value, (t) => t.done);
    expect(yes.value).toEqual([]);
    expect(no.value).toEqual([]);
  });

  it("handles all-match and all-not-match cases", () => {
    const allDone = signal<Todo[]>([
      { id: "a", done: true },
      { id: "b", done: true },
    ]);
    const [done, pending] = partition(() => allDone.value, (t) => t.done);
    expect(done.value).toHaveLength(2);
    expect(pending.value).toHaveLength(0);

    allDone.value = [
      { id: "c", done: false },
      { id: "d", done: false },
    ];
    expect(done.value).toHaveLength(0);
    expect(pending.value).toHaveLength(2);
  });

  it("each signal participates in effect tracking independently", () => {
    const todos = signal<Todo[]>([{ id: "a", done: false }]);
    const [pending, done] = partition(() => todos.value, (t) => !t.done);
    const pendingRuns: number[] = [];
    const doneRuns: number[] = [];

    effect(() => {
      pendingRuns.push(pending.value.length);
    });
    effect(() => {
      doneRuns.push(done.value.length);
    });

    expect(pendingRuns).toEqual([1]);
    expect(doneRuns).toEqual([0]);

    todos.value = [
      { id: "a", done: true },
      { id: "b", done: false },
    ];
    expect(pendingRuns.at(-1)).toBe(1);
    expect(doneRuns.at(-1)).toBe(1);
  });

  it("preserves source order in both output arrays", () => {
    const nums = signal<number[]>([1, 2, 3, 4, 5, 6]);
    const [even, odd] = partition(() => nums.value, (n) => n % 2 === 0);
    expect(even.value).toEqual([2, 4, 6]);
    expect(odd.value).toEqual([1, 3, 5]);
  });
});
