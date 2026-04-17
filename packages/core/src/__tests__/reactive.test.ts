import { describe, it, expect, vi } from "vitest";
import { signal, computed, effect, batch } from "../reactive.js";

// ── signal ─────────────────────────────────────────────────────────────────

describe("signal", () => {
  it("creates with initial value", () => {
    const s = signal(42);
    expect(s.value).toBe(42);
  });

  it("reads and writes value", () => {
    const s = signal("hello");
    s.value = "world";
    expect(s.value).toBe("world");
  });

  it("updates via function", () => {
    const s = signal(10);
    s.update((n) => n + 5);
    expect(s.value).toBe(15);
  });

  it("sets via .set()", () => {
    const s = signal(0);
    s.set(99);
    expect(s.value).toBe(99);
  });

  it("peek() reads without tracking", () => {
    const s = signal(1);
    const runs: number[] = [];

    effect(() => {
      runs.push(s.peek());
    });

    expect(runs).toEqual([1]);

    s.value = 2;
    // Effect should NOT re-run because peek() doesn't track
    expect(runs).toEqual([1]);
  });

  it("skips notification when value is the same (Object.is)", () => {
    const s = signal(5);
    const runs: number[] = [];

    effect(() => {
      runs.push(s.value);
    });

    expect(runs).toEqual([5]);

    s.value = 5; // same value
    expect(runs).toEqual([5]); // no re-run
  });

  it("subscribe() calls immediately and on change", () => {
    const s = signal("a");
    const values: string[] = [];

    const unsub = s.subscribe((v) => values.push(v));

    expect(values).toEqual(["a"]);

    s.value = "b";
    expect(values).toEqual(["a", "b"]);

    unsub();
    s.value = "c";
    expect(values).toEqual(["a", "b"]); // no more
  });

  it("handles null and undefined values", () => {
    const s = signal<string | null>(null);
    expect(s.value).toBeNull();
    s.value = "test";
    expect(s.value).toBe("test");
    s.value = null;
    expect(s.value).toBeNull();
  });

  it("handles object values", () => {
    const obj1 = { x: 1 };
    const obj2 = { x: 2 };
    const s = signal(obj1);
    expect(s.value).toBe(obj1);
    s.value = obj2;
    expect(s.value).toBe(obj2);
  });
});

// ── computed ───────────────────────────────────────────────────────────────

describe("computed", () => {
  it("derives value from signal", () => {
    const count = signal(3);
    const double = computed(() => count.value * 2);
    expect(double.value).toBe(6);
  });

  it("updates when dependency changes", () => {
    const count = signal(1);
    const double = computed(() => count.value * 2);

    count.value = 5;
    expect(double.value).toBe(10);
  });

  it("is lazy — does not compute until read", () => {
    const fn = vi.fn(() => 42);
    const c = computed(fn);

    expect(fn).not.toHaveBeenCalled();

    expect(c.value).toBe(42);
    expect(fn).toHaveBeenCalledTimes(1);
  });

  it("caches value until dependency changes", () => {
    const s = signal(1);
    const fn = vi.fn(() => s.value * 10);
    const c = computed(fn);

    c.value; // first read
    c.value; // second read — should use cache
    expect(fn).toHaveBeenCalledTimes(1);

    s.value = 2;
    c.value; // should recompute
    expect(fn).toHaveBeenCalledTimes(2);
  });

  it("peek() reads without tracking", () => {
    const s = signal(5);
    const c = computed(() => s.value * 3);
    expect(c.peek()).toBe(15);
  });

  it("handles diamond dependency", () => {
    const a = signal(1);
    const b = computed(() => a.value * 2);
    const c = computed(() => a.value * 3);
    const d = computed(() => b.value + c.value);

    expect(d.value).toBe(5); // 2 + 3

    a.value = 2;
    expect(d.value).toBe(10); // 4 + 6
  });

  it("chains computed values", () => {
    const base = signal(2);
    const doubled = computed(() => base.value * 2);
    const quadrupled = computed(() => doubled.value * 2);

    expect(quadrupled.value).toBe(8);

    base.value = 3;
    expect(quadrupled.value).toBe(12);
  });

  it("subscribe() works like signal subscribe", () => {
    const s = signal(1);
    const c = computed(() => s.value + 10);
    const values: number[] = [];

    const unsub = c.subscribe((v) => values.push(v));
    expect(values).toEqual([11]);

    s.value = 2;
    expect(values).toEqual([11, 12]);

    unsub();
    s.value = 3;
    expect(values).toEqual([11, 12]);
  });
});

// ── effect ─────────────────────────────────────────────────────────────────

describe("effect", () => {
  it("runs immediately", () => {
    const fn = vi.fn();
    effect(fn);
    expect(fn).toHaveBeenCalledTimes(1);
  });

  it("re-runs when dependency changes", () => {
    const s = signal(0);
    const values: number[] = [];

    effect(() => {
      values.push(s.value);
    });

    expect(values).toEqual([0]);

    s.value = 1;
    expect(values).toEqual([0, 1]);

    s.value = 2;
    expect(values).toEqual([0, 1, 2]);
  });

  it("runs cleanup function before re-execution", () => {
    const s = signal(0);
    const events: string[] = [];

    effect(() => {
      const val = s.value;
      events.push(`run:${val}`);
      return () => events.push(`cleanup:${val}`);
    });

    expect(events).toEqual(["run:0"]);

    s.value = 1;
    expect(events).toEqual(["run:0", "cleanup:0", "run:1"]);

    s.value = 2;
    expect(events).toEqual([
      "run:0",
      "cleanup:0",
      "run:1",
      "cleanup:1",
      "run:2",
    ]);
  });

  it("dispose stops re-running", () => {
    const s = signal(0);
    const values: number[] = [];

    const dispose = effect(() => {
      values.push(s.value);
    });

    expect(values).toEqual([0]);

    dispose();
    s.value = 1;
    expect(values).toEqual([0]); // no re-run
  });

  it("dispose runs cleanup", () => {
    const events: string[] = [];

    const dispose = effect(() => {
      events.push("run");
      return () => events.push("cleanup");
    });

    expect(events).toEqual(["run"]);

    dispose();
    expect(events).toEqual(["run", "cleanup"]);
  });

  it("tracks multiple dependencies", () => {
    const a = signal(1);
    const b = signal(2);
    const sums: number[] = [];

    effect(() => {
      sums.push(a.value + b.value);
    });

    expect(sums).toEqual([3]);

    a.value = 10;
    expect(sums).toEqual([3, 12]);

    b.value = 20;
    expect(sums).toEqual([3, 12, 30]);
  });

  it("tracks computed dependencies", () => {
    const s = signal(2);
    const c = computed(() => s.value * 10);
    const values: number[] = [];

    effect(() => {
      values.push(c.value);
    });

    expect(values).toEqual([20]);

    s.value = 3;
    expect(values).toEqual([20, 30]);
  });

  it("handles conditional dependency tracking", () => {
    const flag = signal(true);
    const a = signal("A");
    const b = signal("B");
    const values: string[] = [];

    effect(() => {
      values.push(flag.value ? a.value : b.value);
    });

    expect(values).toEqual(["A"]);

    // Change b — should NOT trigger (not tracked when flag=true)
    b.value = "B2";
    expect(values).toEqual(["A"]);

    // Change flag — now tracks b
    flag.value = false;
    expect(values).toEqual(["A", "B2"]);

    // Verify b is actually tracked now
    b.value = "B3";
    expect(values).toEqual(["A", "B2", "B3"]);
  });
});

// ── batch ──────────────────────────────────────────────────────────────────

describe("batch", () => {
  it("defers effect re-runs until batch completes", () => {
    const a = signal(1);
    const b = signal(2);
    const runs: number[] = [];

    effect(() => {
      runs.push(a.value + b.value);
    });

    expect(runs).toEqual([3]);

    batch(() => {
      a.value = 10;
      b.value = 20;
    });

    // Should only run once, not twice
    expect(runs).toEqual([3, 30]);
  });

  it("nested batch only flushes at outermost", () => {
    const s = signal(0);
    const runs: number[] = [];

    effect(() => {
      runs.push(s.value);
    });

    expect(runs).toEqual([0]);

    batch(() => {
      s.value = 1;
      batch(() => {
        s.value = 2;
      });
      // Inner batch should NOT flush yet
      s.value = 3;
    });

    // Only final value should have triggered a single re-run
    expect(runs).toEqual([0, 3]);
  });

  it("returns void (does not propagate return value)", () => {
    const result = batch(() => {
      signal(1);
    });
    expect(result).toBeUndefined();
  });

  it("flushes even if callback throws", () => {
    const s = signal(0);
    const runs: number[] = [];

    effect(() => {
      runs.push(s.value);
    });

    try {
      batch(() => {
        s.value = 42;
        throw new Error("boom");
      });
    } catch {
      // expected
    }

    // Batch should still flush pending effects
    expect(runs).toEqual([0, 42]);
  });
});

// ── Edge Cases ──────────────────────────────────────────────────────────────

describe("edge cases", () => {
  it("handles multiple effects on the same signal", () => {
    const s = signal(0);
    const log1: number[] = [];
    const log2: number[] = [];

    const dispose1 = effect(() => {
      log1.push(s.value);
    });
    const dispose2 = effect(() => {
      log2.push(s.value);
    });

    s.value = 1;
    expect(log1).toEqual([0, 1]);
    expect(log2).toEqual([0, 1]);

    // Disposing one doesn't affect the other
    dispose1();
    s.value = 2;
    expect(log1).toEqual([0, 1]); // stopped
    expect(log2).toEqual([0, 1, 2]); // still running

    dispose2();
  });

  it("handles signal mutation during batch flush", () => {
    const a = signal(0);
    const b = signal(0);
    const log: string[] = [];

    effect(() => {
      log.push(`a=${a.value}`);
      if (a.value === 1) {
        b.value = 10; // mutate b during effect triggered by a
      }
    });

    effect(() => {
      log.push(`b=${b.value}`);
    });

    log.length = 0;
    batch(() => {
      a.value = 1;
    });

    expect(log).toContain("a=1");
    expect(log).toContain("b=10");
  });

  it("handles conditional dependency switching", () => {
    const toggle = signal(true);
    const a = signal("A");
    const b = signal("B");
    const log: string[] = [];

    const dispose = effect(() => {
      const val = toggle.value ? a.value : b.value;
      log.push(val);
    });

    expect(log).toEqual(["A"]);

    // Change untracked signal — should NOT trigger
    b.value = "B2";
    expect(log).toEqual(["A"]);

    // Switch dependency
    toggle.value = false;
    expect(log).toEqual(["A", "B2"]);

    // Now a is untracked
    a.value = "A2";
    expect(log).toEqual(["A", "B2"]);

    // b is now tracked
    b.value = "B3";
    expect(log).toEqual(["A", "B2", "B3"]);

    dispose();
  });

  it("handles deeply nested computed chains", () => {
    const base = signal(1);
    const c1 = computed(() => base.value * 2);
    const c2 = computed(() => c1.value + 1);
    const c3 = computed(() => c2.value * 3);
    const c4 = computed(() => c3.value - 2);

    expect(c4.value).toBe((1 * 2 + 1) * 3 - 2); // 7

    base.value = 5;
    expect(c4.value).toBe((5 * 2 + 1) * 3 - 2); // 31
  });

  it("peek() does not create dependency in effect", () => {
    const tracked = signal(0);
    const untracked = signal(0);
    const log: string[] = [];

    const dispose = effect(() => {
      log.push(`t=${tracked.value},u=${untracked.peek()}`);
    });

    expect(log).toEqual(["t=0,u=0"]);

    // Changing untracked should NOT re-run effect
    untracked.value = 99;
    expect(log).toEqual(["t=0,u=0"]);

    // Changing tracked SHOULD re-run, and peek sees latest untracked
    tracked.value = 1;
    expect(log).toEqual(["t=0,u=0", "t=1,u=99"]);

    dispose();
  });

  it("handles rapid sequential updates", () => {
    const s = signal(0);
    const log: number[] = [];

    const dispose = effect(() => {
      log.push(s.value);
    });

    for (let i = 1; i <= 100; i++) {
      s.value = i;
    }

    // Should have tracked all updates (no batching)
    expect(log.length).toBe(101); // initial + 100 updates
    expect(log[0]).toBe(0);
    expect(log[100]).toBe(100);

    dispose();
  });

  it("batched rapid updates collapse to one notification", () => {
    const s = signal(0);
    const log: number[] = [];

    const dispose = effect(() => {
      log.push(s.value);
    });

    batch(() => {
      for (let i = 1; i <= 100; i++) {
        s.value = i;
      }
    });

    // Initial + one batched update
    expect(log).toEqual([0, 100]);

    dispose();
  });
});
