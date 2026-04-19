import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { signal } from "../reactive.js";
import { div, span, button, p, mount } from "../elements.js";
import { component, onMount, onCleanup, resource } from "../component.js";
import type { WhisqNode } from "../elements.js";

// ── Test helpers ────────────────────────────────────────────────────────────

let container: HTMLElement;
let dispose: () => void;

beforeEach(() => {
  container = document.createElement("div");
  document.body.appendChild(container);
});

afterEach(() => {
  if (dispose) dispose();
  container.remove();
});

// ── component() ────────────────────────────────────────────────────────────

describe("component()", () => {
  it("creates a callable component definition", () => {
    const Greeting = component(() => p("Hello"));
    expect(Greeting.__whisq_component).toBe(true);
    expect(typeof Greeting).toBe("function");
  });

  it("renders returned template into DOM", () => {
    const App = component(() => div(p("Hello Whisq")));
    dispose = mount(App({}), container);

    expect(container.textContent).toBe("Hello Whisq");
  });

  it("passes props to setup function", () => {
    const Greet = component((props: { name: string }) =>
      p(`Hello ${props.name}`),
    );
    dispose = mount(Greet({ name: "World" }), container);

    expect(container.textContent).toBe("Hello World");
  });

  it("supports reactive state within component", () => {
    const Counter = component(() => {
      const count = signal(0);
      return div(
        button({ onclick: () => count.value++ }, "+"),
        span(() => String(count.value)),
      );
    });

    dispose = mount(Counter({}), container);

    expect(container.querySelector("span")!.textContent).toBe("0");

    container.querySelector("button")!.click();
    expect(container.querySelector("span")!.textContent).toBe("1");
  });

  it("supports nested components", () => {
    const Child = component((props: { text: string }) => span(props.text));
    const Parent = component(() =>
      div(Child({ text: "A" }), Child({ text: "B" })),
    );

    dispose = mount(Parent({}), container);

    const spans = container.querySelectorAll("span");
    expect(spans.length).toBe(2);
    expect(spans[0].textContent).toBe("A");
    expect(spans[1].textContent).toBe("B");
  });
});

// ── onMount ────────────────────────────────────────────────────────────────

describe("onMount()", () => {
  it("fires callback after mount", async () => {
    const mounted = vi.fn();

    const App = component(() => {
      onMount(mounted);
      return div("content");
    });

    dispose = mount(App({}), container);

    // onMount fires on next microtask
    await new Promise((r) => queueMicrotask(r));

    expect(mounted).toHaveBeenCalledTimes(1);
  });

  it("cleanup returned from onMount runs on dispose", async () => {
    const events: string[] = [];

    const App = component(() => {
      onMount(() => {
        events.push("mounted");
        return () => events.push("cleanup");
      });
      return div("content");
    });

    dispose = mount(App({}), container);
    await new Promise((r) => queueMicrotask(r));

    expect(events).toEqual(["mounted"]);

    dispose();
    expect(events).toEqual(["mounted", "cleanup"]);
  });

  it("multiple onMount callbacks fire in order", async () => {
    const order: number[] = [];

    const App = component(() => {
      onMount(() => {
        order.push(1);
      });
      onMount(() => {
        order.push(2);
      });
      onMount(() => {
        order.push(3);
      });
      return div("content");
    });

    dispose = mount(App({}), container);
    await new Promise((r) => queueMicrotask(r));

    expect(order).toEqual([1, 2, 3]);
  });
});

// ── onCleanup ──────────────────────────────────────────────────────────────

describe("onCleanup()", () => {
  it("fires on dispose", () => {
    const cleanup = vi.fn();

    const App = component(() => {
      onCleanup(cleanup);
      return div("content");
    });

    dispose = mount(App({}), container);
    expect(cleanup).not.toHaveBeenCalled();

    dispose();
    expect(cleanup).toHaveBeenCalledTimes(1);
  });

  it("multiple onCleanup callbacks fire", () => {
    const events: string[] = [];

    const App = component(() => {
      onCleanup(() => events.push("a"));
      onCleanup(() => events.push("b"));
      return div("content");
    });

    dispose = mount(App({}), container);
    dispose();

    expect(events).toEqual(["a", "b"]);
  });

  it("throws when called outside component", () => {
    expect(() => onCleanup(() => {})).toThrow(
      "must be called inside a component()",
    );
  });

  it("onMount throws when called outside component", () => {
    expect(() => onMount(() => {})).toThrow(
      "must be called inside a component()",
    );
  });
});

// ── resource() ─────────────────────────────────────────────────────────────

describe("resource()", () => {
  it("starts in loading state", () => {
    const r = resource(() => Promise.resolve("data"));

    expect(r.loading()).toBe(true);
    expect(r.data()).toBeUndefined();
    expect(r.error()).toBeUndefined();
  });

  it("resolves to data state", async () => {
    const r = resource(() => Promise.resolve("hello"));

    await vi.waitFor(() => {
      expect(r.loading()).toBe(false);
    });

    expect(r.data()).toBe("hello");
    expect(r.error()).toBeUndefined();
  });

  it("resolves to error state", async () => {
    const r = resource(() => Promise.reject(new Error("fail")));

    await vi.waitFor(() => {
      expect(r.loading()).toBe(false);
    });

    expect(r.data()).toBeUndefined();
    expect(r.error()!.message).toBe("fail");
  });

  it("handles non-Error throws", async () => {
    const r = resource(() => Promise.reject("string error"));

    await vi.waitFor(() => {
      expect(r.loading()).toBe(false);
    });

    expect(r.error()!.message).toBe("string error");
  });

  it("refetch re-executes the fetcher", async () => {
    let count = 0;
    const r = resource(() => Promise.resolve(++count));

    await vi.waitFor(() => {
      expect(r.loading()).toBe(false);
    });
    expect(r.data()).toBe(1);

    r.refetch();
    await vi.waitFor(() => {
      expect(r.data()).toBe(2);
    });
  });

  // ── mutate() ───────────────────────────────────────────────────────────

  it("mutate(value) sets data synchronously without fetching", async () => {
    const r = resource(() => Promise.resolve("fetched"));
    await vi.waitFor(() => expect(r.loading()).toBe(false));

    r.mutate("optimistic");
    expect(r.data()).toBe("optimistic");
  });

  it("mutate(updater) receives the previous value", async () => {
    const r = resource<number[]>(() => Promise.resolve([1, 2, 3]));
    await vi.waitFor(() => expect(r.loading()).toBe(false));

    r.mutate((prev) => [...(prev ?? []), 4]);
    expect(r.data()).toEqual([1, 2, 3, 4]);
  });

  // ── initialValue ───────────────────────────────────────────────────────

  it("initialValue populates data() before the first fetch resolves", () => {
    const r = resource(() => Promise.resolve("late"), {
      initialValue: "early",
    });
    expect(r.data()).toBe("early");
    expect(r.loading()).toBe(true);
  });

  it("initialValue is replaced by the fetched value", async () => {
    const r = resource(() => Promise.resolve("late"), {
      initialValue: "early",
    });
    await vi.waitFor(() => expect(r.loading()).toBe(false));
    expect(r.data()).toBe("late");
  });

  // ── keepPrevious ───────────────────────────────────────────────────────

  it("keeps the previous value during refetch by default", async () => {
    let nth = 0;
    const r = resource(() => Promise.resolve(++nth));
    await vi.waitFor(() => expect(r.loading()).toBe(false));
    expect(r.data()).toBe(1);

    r.refetch();
    expect(r.data()).toBe(1); // still visible during refetch
    await vi.waitFor(() => expect(r.data()).toBe(2));
  });

  it("resets data to undefined during refetch when keepPrevious is false", async () => {
    let nth = 0;
    const r = resource(() => Promise.resolve(++nth), { keepPrevious: false });
    await vi.waitFor(() => expect(r.loading()).toBe(false));
    expect(r.data()).toBe(1);

    r.refetch();
    expect(r.data()).toBeUndefined();
    await vi.waitFor(() => expect(r.data()).toBe(2));
  });

  // ── AbortSignal ────────────────────────────────────────────────────────

  it("passes an AbortSignal to the fetcher", async () => {
    let captured: AbortSignal | undefined;
    const r = resource(({ signal }) => {
      captured = signal;
      return Promise.resolve("ok");
    });
    await vi.waitFor(() => expect(r.loading()).toBe(false));
    expect(captured).toBeInstanceOf(AbortSignal);
    expect(captured!.aborted).toBe(false);
  });

  it("aborts the previous signal when refetch is called", async () => {
    const signals: AbortSignal[] = [];
    const r = resource(({ signal }) => {
      signals.push(signal);
      return new Promise<string>((resolve) =>
        setTimeout(() => resolve("done"), 20),
      );
    });
    r.refetch();
    await vi.waitFor(() => expect(r.data()).toBe("done"));
    expect(signals[0].aborted).toBe(true);
    expect(signals[signals.length - 1].aborted).toBe(false);
  });

  it("drops stale responses — newer fetch always wins", async () => {
    const fetches: Array<(v: string) => void> = [];
    const r = resource(
      () =>
        new Promise<string>((resolve) => {
          fetches.push(resolve);
        }),
    );
    r.refetch();
    // Resolve the second (newer) fetch first, then the first (stale).
    fetches[1]("new");
    await vi.waitFor(() => expect(r.data()).toBe("new"));
    fetches[0]("old");
    await new Promise((r) => setTimeout(r, 0));
    expect(r.data()).toBe("new");
  });

  it("does not surface an AbortError when a fetch is cancelled", async () => {
    const r = resource(
      ({ signal }) =>
        new Promise<string>((resolve, reject) => {
          signal.addEventListener("abort", () =>
            reject(new Error("AbortError")),
          );
          setTimeout(() => resolve("done"), 20);
        }),
    );
    r.refetch();
    await vi.waitFor(() => expect(r.data()).toBe("done"));
    expect(r.error()).toBeUndefined();
  });

  // ── source ─────────────────────────────────────────────────────────────

  it("re-runs the fetcher when the source signal changes", async () => {
    const id = signal(1);
    const seen: number[] = [];
    const r = resource(
      (src: number) => {
        seen.push(src);
        return Promise.resolve(`user-${src}`);
      },
      { source: () => id.value },
    );
    await vi.waitFor(() => expect(r.data()).toBe("user-1"));

    id.value = 2;
    await vi.waitFor(() => expect(r.data()).toBe("user-2"));
    expect(seen).toEqual([1, 2]);
  });

  it("passes source as the first fetcher arg and signal as the second", async () => {
    const id = signal("abc");
    let capturedSrc: string | undefined;
    let capturedSignal: AbortSignal | undefined;
    const r = resource(
      (src: string, { signal }) => {
        capturedSrc = src;
        capturedSignal = signal;
        return Promise.resolve(`ok-${src}`);
      },
      { source: () => id.value },
    );
    await vi.waitFor(() => expect(r.data()).toBe("ok-abc"));
    expect(capturedSrc).toBe("abc");
    expect(capturedSignal).toBeInstanceOf(AbortSignal);
  });
});
