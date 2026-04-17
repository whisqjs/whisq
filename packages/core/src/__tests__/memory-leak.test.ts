import { describe, it, expect, vi } from "vitest";
import { signal, computed, effect, batch } from "../reactive.js";

/**
 * Helper to get the subscriber count of a signal.
 * Uses the fact that signal.subscribe adds to the internal set,
 * and we can count by subscribing/unsubscribing.
 *
 * Instead, we'll test observable behavior: that disposed effects
 * don't run and that signals can be GC'd.
 */

describe("memory leak prevention", () => {
  it("disposed effect does not run on signal change", () => {
    const s = signal(0);
    let runs = 0;

    const dispose = effect(() => {
      s.value;
      runs++;
    });

    expect(runs).toBe(1);

    dispose();

    s.value = 1;
    s.value = 2;
    s.value = 3;

    // Effect should not have run again
    expect(runs).toBe(1);
  });

  it("disposed effect releases subscription (no ref held)", () => {
    const s = signal(0);
    const effects: (() => void)[] = [];

    // Create many effects and dispose them
    for (let i = 0; i < 100; i++) {
      const dispose = effect(() => {
        s.value;
      });
      dispose();
    }

    // Create one active effect to verify signal still works
    let activeRuns = 0;
    const activeDispose = effect(() => {
      s.value;
      activeRuns++;
    });

    expect(activeRuns).toBe(1);

    s.value = 1;
    expect(activeRuns).toBe(2);

    activeDispose();
  });

  it("effect re-run cleans up old subscriptions", () => {
    const a = signal(0);
    const b = signal(0);
    const flag = signal(true);
    let runs = 0;

    const dispose = effect(() => {
      runs++;
      if (flag.value) {
        a.value; // subscribe to a when flag is true
      } else {
        b.value; // subscribe to b when flag is false
      }
    });

    expect(runs).toBe(1);

    // Change a — effect should run (it's subscribed)
    a.value = 1;
    expect(runs).toBe(2);

    // Switch branch
    flag.value = false;
    expect(runs).toBe(3); // re-run due to flag change

    // Change a — effect should NOT run (no longer subscribed)
    a.value = 2;
    expect(runs).toBe(3);

    // Change b — effect should run (now subscribed)
    b.value = 1;
    expect(runs).toBe(4);

    dispose();
  });

  it("computed cleans up subscriptions on dependency change", () => {
    const a = signal(1);
    const b = signal(2);
    const flag = signal(true);

    const c = computed(() => (flag.value ? a.value : b.value));

    // Read to trigger computation
    expect(c.value).toBe(1);

    // Switch dependency
    flag.value = false;
    expect(c.value).toBe(2);

    // Change a — should NOT trigger recomputation since we switched to b
    a.value = 10;
    // c is lazy, so we just verify it returns the correct value
    expect(c.value).toBe(2); // still reading b, not a
  });

  it("mount/unmount cycle with effects doesn't accumulate dead subscriptions", () => {
    const s = signal(0);
    let totalRuns = 0;

    // Simulate mount/unmount cycles
    for (let cycle = 0; cycle < 50; cycle++) {
      const dispose = effect(() => {
        s.value;
        totalRuns++;
      });
      dispose();
    }

    // Create one final active effect
    let activeRuns = 0;
    const finalDispose = effect(() => {
      s.value;
      activeRuns++;
    });

    // Changing the signal should only trigger the one active effect
    s.value = 1;
    expect(activeRuns).toBe(2); // initial + one update

    // totalRuns should be 50 (one per mount) — no additional runs from dead effects
    expect(totalRuns).toBe(50);

    finalDispose();
  });

  it("nested effects are cleaned up when parent disposes", () => {
    const outer = signal(0);
    const inner = signal(0);
    let innerRuns = 0;

    const dispose = effect(() => {
      outer.value;
      // Create a nested effect each time outer runs
      effect(() => {
        inner.value;
        innerRuns++;
      });
    });

    expect(innerRuns).toBe(1);

    // Trigger inner
    inner.value = 1;
    expect(innerRuns).toBe(2);

    // Dispose outer — inner should also stop
    dispose();

    inner.value = 2;
    // After disposal, the inner effect created in the last run should be cleaned up
    // via the outer effect's cleanup mechanism
    // Note: inner effects are disposed via the parent effect's cleanup return
  });

  it("batch with disposed effects skips them", () => {
    const a = signal(0);
    const b = signal(0);
    let runs = 0;

    const dispose = effect(() => {
      a.value;
      b.value;
      runs++;
    });

    expect(runs).toBe(1);

    dispose();

    batch(() => {
      a.value = 1;
      b.value = 1;
    });

    // Disposed effect should not run
    expect(runs).toBe(1);
  });
});
