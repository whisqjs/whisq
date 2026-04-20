// Pins the four `batch()` semantics documented in
// packages/core/docs/batch-semantics.md. If these tests break, the docs
// need updating (or the test describes a regression).

import { describe, it, expect, vi } from "vitest";
import { signal, computed, effect, batch } from "../reactive.js";

describe("batch() — computed recomputation", () => {
  it("mid-batch reads of a computed return the STALE value", () => {
    const a = signal(1);
    const b = signal(2);
    const sum = computed(() => a.value + b.value);

    // Prime the computed so it has a cached value.
    expect(sum.value).toBe(3);

    let midBatchRead = -1;
    batch(() => {
      a.value = 10;
      b.value = 20;
      // Recompute is queued as a deferred effect, not run yet.
      // `dirty` is still false, so this read returns the cached sum.
      midBatchRead = sum.value;
    });

    expect(midBatchRead).toBe(3); // stale
    expect(sum.value).toBe(30); // fresh after flush
  });

  it("computed recompute runs exactly once after a batch with multiple dep writes", () => {
    const a = signal(1);
    const b = signal(2);
    const fn = vi.fn((av: number, bv: number) => av + bv);
    const sum = computed(() => fn(a.value, b.value));

    // One initial evaluation to prime.
    sum.value;
    expect(fn).toHaveBeenCalledTimes(1);

    batch(() => {
      a.value = 10;
      b.value = 20;
      a.value = 100;
      b.value = 200;
    });

    // Reading after the batch triggers at most one re-evaluation.
    expect(sum.value).toBe(300);
    expect(fn).toHaveBeenCalledTimes(2); // prime + one post-batch recompute
  });

  it("effects that read a computed inside a batch observe the stale value, run once after", () => {
    const a = signal(1);
    const doubled = computed(() => a.value * 2);

    const seen: number[] = [];
    effect(() => {
      seen.push(doubled.value);
    });
    expect(seen).toEqual([2]); // initial

    batch(() => {
      a.value = 10;
      a.value = 20;
      a.value = 30;
    });

    expect(seen).toEqual([2, 60]); // one deferred run, with the final value
  });
});

describe("batch() — nested batches are flattened", () => {
  it("effects only flush at the outermost batch boundary", () => {
    const a = signal(0);
    const b = signal(0);
    const spy = vi.fn(() => {
      a.value;
      b.value;
    });
    effect(spy);
    expect(spy).toHaveBeenCalledTimes(1); // initial

    batch(() => {
      a.value = 1;
      batch(() => {
        b.value = 2;
      });
      // Still inside outer batch — effect has NOT re-run here.
      expect(spy).toHaveBeenCalledTimes(1);
    });

    // Outer batch closed → single flush.
    expect(spy).toHaveBeenCalledTimes(2);
  });

  it("deeply nested batches still collapse to a single flush", () => {
    const a = signal(0);
    const spy = vi.fn(() => {
      a.value;
    });
    effect(spy);

    batch(() => {
      batch(() => {
        batch(() => {
          batch(() => {
            a.value = 1;
            a.value = 2;
            a.value = 3;
          });
        });
      });
    });

    expect(spy).toHaveBeenCalledTimes(2); // 1 initial + 1 post-flush
  });

  it("an inner batch does not flush effects queued by the outer batch", () => {
    const a = signal(0);
    const b = signal(0);
    const spy = vi.fn(() => {
      a.value;
      b.value;
    });
    effect(spy);
    const before = spy.mock.calls.length;

    batch(() => {
      a.value = 1; // queues spy
      batch(() => {
        b.value = 2; // also queues spy (same Set, deduped)
        // Inner batch is about to exit, but depth is still 1 — no flush.
      });
      // Still 1 total pending run.
      expect(spy.mock.calls.length).toBe(before);
    });

    expect(spy.mock.calls.length).toBe(before + 1);
  });
});

describe("batch() — async / await boundary", () => {
  it("writes before the first await are batched; writes after are not", async () => {
    const a = signal(0);
    const b = signal(0);
    const spy = vi.fn(() => {
      a.value;
      b.value;
    });
    effect(spy);
    const before = spy.mock.calls.length;

    // batch() signature is `(fn: () => void)` — async is NOT supported by
    // the contract. We still verify the mechanical behavior: the sync
    // portion is batched, the post-await portion is not.
    //
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const asyncFn = async () => {
      a.value = 1; // inside batch — effect deferred
      await Promise.resolve();
      b.value = 2; // outside batch — effect runs immediately
    };

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (batch as any)(asyncFn);

    // After the synchronous call returns, the sync writes have flushed
    // (one effect run for a.value = 1).
    expect(spy.mock.calls.length).toBe(before + 1);

    // Let the async continuation run.
    await new Promise((r) => setTimeout(r, 0));

    // b.value = 2 ran outside the batch → a separate effect run.
    expect(spy.mock.calls.length).toBe(before + 2);
  });

  it("batch() is synchronous: the returned value is void and does not await", () => {
    const calls: string[] = [];
    batch(() => {
      calls.push("sync-before");
      Promise.resolve().then(() => calls.push("microtask-after-return"));
      calls.push("sync-after");
    });
    expect(calls).toEqual(["sync-before", "sync-after"]);
  });
});

describe("batch() — throw behavior", () => {
  it("writes performed before the throw are committed (not rolled back)", () => {
    const a = signal(1);
    const b = signal(2);

    expect(() => {
      batch(() => {
        a.value = 10;
        throw new Error("oops");
        // b.value = 20 — unreachable
      });
    }).toThrow("oops");

    expect(a.value).toBe(10); // committed
    expect(b.value).toBe(2); // unchanged because the assignment never ran
  });

  it("effects for the applied writes still flush after a throw", () => {
    const a = signal(0);
    const spy = vi.fn(() => {
      a.value;
    });
    effect(spy);
    expect(spy).toHaveBeenCalledTimes(1);

    expect(() => {
      batch(() => {
        a.value = 42;
        throw new Error("boom");
      });
    }).toThrow("boom");

    // The `finally` block in batch() flushes pendingEffects before the
    // error propagates, so the effect sees the committed write.
    expect(spy).toHaveBeenCalledTimes(2);
  });

  it("after a throw, batchDepth resets cleanly — a later batch flushes as normal", () => {
    const a = signal(0);
    const spy = vi.fn(() => {
      a.value;
    });
    effect(spy);

    // Throw in an outer batch — should leave batchDepth at 0.
    expect(() => {
      batch(() => {
        throw new Error("first");
      });
    }).toThrow("first");

    // Subsequent batch must still defer + flush correctly.
    const before = spy.mock.calls.length;
    batch(() => {
      a.value = 1;
      a.value = 2;
    });
    expect(spy.mock.calls.length).toBe(before + 1);
  });
});
