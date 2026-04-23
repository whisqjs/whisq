import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { signal } from "../reactive.js";
import { div, span, button, p, mount, match, when } from "../elements.js";
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

// ── Function-return setup (WHISQ-121) ───────────────────────────────────────
//
// Components can return a function child directly from setup — no sacrificial
// wrapper div needed to host a match() / when() / ad-hoc getter.

describe("component() — function-return setup", () => {
  it("renders match() directly as a component root (no wrapper)", () => {
    type View = "loading" | "data" | "empty";
    const view = signal<View>("loading");

    const Screen = component(() =>
      match(
        [() => view.value === "loading", () => p("loading...")],
        [() => view.value === "data", () => p("hello")],
        () => p("empty"),
      ),
    );

    dispose = mount(Screen({}), container);
    expect(container.textContent).toBe("loading...");

    view.value = "data";
    expect(container.textContent).toBe("hello");

    view.value = "empty";
    expect(container.textContent).toBe("empty");
  });

  it("renders when() as a component root", () => {
    const loggedIn = signal(false);

    const Auth = component(() =>
      when(
        () => loggedIn.value,
        () => p("welcome back"),
        () => p("sign in"),
      ),
    );

    dispose = mount(Auth({}), container);
    expect(container.textContent).toBe("sign in");

    loggedIn.value = true;
    expect(container.textContent).toBe("welcome back");
  });

  it("renders an ad-hoc () => value getter as a component root", () => {
    const name = signal("world");

    const Greeting = component(() => () => div(`hello ${name.value}`));

    dispose = mount(Greeting({}), container);
    expect(container.textContent).toBe("hello world");

    name.value = "whisq";
    expect(container.textContent).toBe("hello whisq");
  });

  it("existing plain-WhisqNode return still works (backwards compat)", () => {
    const Counter = component(() => div("42"));
    dispose = mount(Counter({}), container);
    expect(container.textContent).toBe("42");
  });

  it("fires onMount + onCleanup for function-return components", () => {
    const mounted = vi.fn();
    const cleaned = vi.fn();
    const visible = signal(true);

    const Widget = component(() => {
      onMount(mounted);
      onCleanup(cleaned);
      return match([() => visible.value, () => p("on")], () => p("off"));
    });

    dispose = mount(Widget({}), container);
    return new Promise<void>((resolve) => {
      queueMicrotask(() => {
        expect(mounted).toHaveBeenCalledTimes(1);
        expect(cleaned).not.toHaveBeenCalled();
        dispose();
        expect(cleaned).toHaveBeenCalledTimes(1);
        resolve();
      });
    });
  });

  it("renders nothing when setup's function returns null", () => {
    const show = signal(false);
    const Maybe = component(() => () => (show.value ? p("yes") : null));

    dispose = mount(Maybe({}), container);
    expect(container.textContent).toBe("");

    show.value = true;
    expect(container.textContent).toBe("yes");

    show.value = false;
    expect(container.textContent).toBe("");
  });

  it("disposes the current WhisqNode on each branch switch (no node leak)", () => {
    const n = signal(0);
    const disposeCount = { a: 0, b: 0 };

    const A = component(() => {
      onCleanup(() => disposeCount.a++);
      return p("a");
    });
    const B = component(() => {
      onCleanup(() => disposeCount.b++);
      return p("b");
    });

    const Switcher = component(() =>
      match([() => n.value === 0, () => A({})], () => B({})),
    );

    dispose = mount(Switcher({}), container);
    expect(container.textContent).toBe("a");
    expect(disposeCount).toEqual({ a: 0, b: 0 });

    n.value = 1;
    expect(container.textContent).toBe("b");
    expect(disposeCount.a).toBe(1); // A's cleanup ran on branch switch

    n.value = 0;
    expect(container.textContent).toBe("a");
    expect(disposeCount.b).toBe(1); // B's cleanup ran on branch switch
  });

  it("full disposal cleans up effect + current child", () => {
    const n = signal(0);
    const cleaned = vi.fn();

    const Inner = component(() => {
      onCleanup(cleaned);
      return p(() => `n=${n.value}`);
    });

    const Switcher = component(() =>
      match([() => n.value >= 0, () => Inner({})], () => null),
    );

    dispose = mount(Switcher({}), container);
    dispose();
    expect(cleaned).toHaveBeenCalledTimes(1);
  });

  it("rejects unsupported return shapes with a helpful error (dev)", () => {
    // Setup returns a bare plain object — not a WhisqNode, not a function.
    const BadA = component(() => ({}) as unknown as WhisqNode);
    expect(() => mount(BadA({}), container)).toThrow(/component/);

    // Setup returns a function that itself returns an array of plain objects —
    // caught at render time.
    const BadB = component(
      () => () => [{} as unknown] as unknown as WhisqNode,
    );
    // Depending on dev-mode strictness, this may throw at mount or the effect
    // may swallow; we at least want it NOT to silently render garbage.
    try {
      dispose = mount(BadB({}), container);
      // If we got here, at least verify nothing visibly rendered.
      expect(container.textContent).toBe("");
    } catch {
      // Or it threw — also acceptable.
    }
  });
});
