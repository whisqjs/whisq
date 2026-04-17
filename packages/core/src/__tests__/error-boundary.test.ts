import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { signal } from "../reactive.js";
import { errorBoundary, div, p, button, span, mount } from "../elements.js";
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

// ── errorBoundary ──────────────────────────────────────────────────────────

describe("errorBoundary", () => {
  it("renders child normally when no error", () => {
    const node = errorBoundary(
      (error) => p("Error: " + error.message),
      () => div(p("Hello")),
    );
    dispose = mount(node, container);

    expect(container.textContent).toBe("Hello");
  });

  it("catches synchronous render error and shows fallback", () => {
    const node = errorBoundary(
      (error) => p("Caught: " + error.message),
      () => {
        throw new Error("render boom");
      },
    );
    dispose = mount(node, container);

    expect(container.textContent).toBe("Caught: render boom");
  });

  it("retry re-renders the child successfully", () => {
    let shouldThrow = true;
    const node = errorBoundary(
      (error, retry) => div(p("Error"), button({ onclick: retry }, "Retry")),
      () => {
        if (shouldThrow) throw new Error("boom");
        return p("Success");
      },
    );
    dispose = mount(node, container);

    expect(container.textContent).toContain("Error");
    expect(container.textContent).toContain("Retry");

    shouldThrow = false;
    container.querySelector("button")!.click();

    expect(container.textContent).toBe("Success");
  });

  it("catches effect error and shows fallback", () => {
    const trigger = signal(false);
    const node = errorBoundary(
      (error) => p("Effect error: " + error.message),
      () =>
        div(
          span(() => {
            if (trigger.value) throw new Error("effect boom");
            return "OK";
          }),
        ),
    );
    dispose = mount(node, container);

    expect(container.textContent).toBe("OK");

    trigger.value = true;

    expect(container.textContent).toBe("Effect error: effect boom");
  });

  it("nested error boundaries — inner catches first", () => {
    const node = errorBoundary(
      (error) => p("Outer: " + error.message),
      () =>
        div(
          errorBoundary(
            (error) => p("Inner: " + error.message),
            () => {
              throw new Error("nested");
            },
          ),
        ),
    );
    dispose = mount(node, container);

    expect(container.textContent).toBe("Inner: nested");
  });

  it("disposes child when effect error occurs", () => {
    let childDisposed = false;
    const trigger = signal(false);
    const node = errorBoundary(
      (error) => p("Error"),
      () => {
        const n = div(
          span(() => {
            if (trigger.value) throw new Error("boom");
            return "OK";
          }),
        );
        const origDispose = n.dispose;
        n.dispose = () => {
          childDisposed = true;
          origDispose();
        };
        return n;
      },
    );
    dispose = mount(node, container);

    expect(childDisposed).toBe(false);

    trigger.value = true;

    expect(childDisposed).toBe(true);
    expect(container.textContent).toBe("Error");
  });

  it("multiple retries work", () => {
    let attempts = 0;
    const node = errorBoundary(
      (error, retry) => button({ onclick: retry }, "Retry"),
      () => {
        attempts++;
        if (attempts < 3) throw new Error("not yet");
        return p("Finally!");
      },
    );
    dispose = mount(node, container);

    expect(attempts).toBe(1);
    expect(container.querySelector("button")).not.toBeNull();

    container.querySelector("button")!.click();
    expect(attempts).toBe(2);
    expect(container.querySelector("button")).not.toBeNull();

    container.querySelector("button")!.click();
    expect(attempts).toBe(3);
    expect(container.textContent).toBe("Finally!");
  });

  it("disposes fallback on retry", () => {
    let fallbackDisposed = false;
    let shouldThrow = true;
    const node = errorBoundary(
      (error, retry) => {
        const n = button({ onclick: retry }, "Retry");
        const origDispose = n.dispose;
        n.dispose = () => {
          fallbackDisposed = true;
          origDispose();
        };
        return n;
      },
      () => {
        if (shouldThrow) throw new Error("boom");
        return p("OK");
      },
    );
    dispose = mount(node, container);

    expect(fallbackDisposed).toBe(false);

    shouldThrow = false;
    container.querySelector("button")!.click();

    expect(fallbackDisposed).toBe(true);
    expect(container.textContent).toBe("OK");
  });

  it("disposes correctly on unmount", () => {
    let childDisposed = false;
    const node = errorBoundary(
      (error) => p("Error"),
      () => {
        const n = div("child");
        const origDispose = n.dispose;
        n.dispose = () => {
          childDisposed = true;
          origDispose();
        };
        return n;
      },
    );
    dispose = mount(node, container);

    expect(container.textContent).toBe("child");
    expect(childDisposed).toBe(false);

    dispose();

    expect(childDisposed).toBe(true);
    expect(container.textContent).toBe("");
  });

  it("error in retry shows fallback again", () => {
    let attempts = 0;
    const node = errorBoundary(
      (error, retry) =>
        div(p("Error #" + attempts), button({ onclick: retry }, "Retry")),
      () => {
        attempts++;
        throw new Error("always fails");
      },
    );
    dispose = mount(node, container);

    expect(container.textContent).toContain("Error #1");

    container.querySelector("button")!.click();

    expect(container.textContent).toContain("Error #2");
  });
});
