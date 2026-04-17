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
});
