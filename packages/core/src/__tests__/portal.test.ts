import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { signal } from "../reactive.js";
import { portal, div, span, p, mount } from "../elements.js";
import type { WhisqNode } from "../elements.js";

// ── Test helpers ────────────────────────────────────────────────────────────

let container: HTMLElement;
let target: HTMLElement;
let dispose: () => void;

beforeEach(() => {
  container = document.createElement("div");
  target = document.createElement("div");
  document.body.appendChild(container);
  document.body.appendChild(target);
});

afterEach(() => {
  if (dispose) dispose();
  container.remove();
  target.remove();
});

// ── portal() ───────────────────────────────────────────────────────────────

describe("portal()", () => {
  it("renders content into target element, not logical parent", () => {
    const node = div(
      p("before"),
      portal(target, span("teleported")),
      p("after"),
    );
    dispose = mount(node, container);

    // Content should be in target, not in container
    expect(target.textContent).toBe("teleported");
    expect(target.querySelector("span")).not.toBeNull();

    // Logical parent should have before/after but not the teleported content
    expect(container.textContent).toBe("beforeafter");
  });

  it("removes content from target on dispose", () => {
    const node = div(portal(target, span("modal")));
    dispose = mount(node, container);

    expect(target.querySelector("span")).not.toBeNull();

    dispose();

    expect(target.querySelector("span")).toBeNull();
    expect(target.textContent).toBe("");
  });

  it("reactive children update normally inside portal", () => {
    const count = signal(0);
    const node = div(
      portal(
        target,
        span(() => `Count: ${count.value}`),
      ),
    );
    dispose = mount(node, container);

    expect(target.textContent).toBe("Count: 0");

    count.value = 42;
    expect(target.textContent).toBe("Count: 42");
  });

  it("portal marker stays in logical parent", () => {
    const node = div(portal(target, span("content")));
    dispose = mount(node, container);

    // The div should contain a comment node (the portal marker)
    const divEl = container.firstElementChild!;
    const hasComment = Array.from(divEl.childNodes).some(
      (n) => n.nodeType === Node.COMMENT_NODE,
    );
    expect(hasComment).toBe(true);
  });

  it("multiple portals to same target", () => {
    const node = div(
      portal(target, span("first")),
      portal(target, span("second")),
    );
    dispose = mount(node, container);

    expect(target.querySelectorAll("span").length).toBe(2);
    expect(target.textContent).toBe("firstsecond");
  });

  it("disposes content effects when portal is disposed", () => {
    const count = signal(0);
    let effectRuns = 0;

    const node = div(
      portal(
        target,
        div(
          span(() => {
            effectRuns++;
            return `${count.value}`;
          }),
        ),
      ),
    );
    dispose = mount(node, container);

    expect(effectRuns).toBe(1);

    count.value = 1;
    expect(effectRuns).toBe(2);

    dispose();

    count.value = 2;
    // Effect should not run after dispose
    expect(effectRuns).toBe(2);
  });
});
