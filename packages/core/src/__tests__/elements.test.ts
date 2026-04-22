import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { signal } from "../reactive.js";
import {
  h,
  div,
  span,
  strong,
  button,
  p,
  input,
  ul,
  li,
  a,
  img,
  when,
  raw,
  mount,
} from "../elements.js";
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

// ── h() — low-level element creation ───────────────────────────────────────

describe("h()", () => {
  it("creates an element with the correct tag", () => {
    const node = h("section");
    expect((node.el as HTMLElement).tagName).toBe("SECTION");
  });

  it("applies static props", () => {
    const node = h("div", { class: "card", id: "main" });
    const el = node.el as HTMLElement;
    expect(el.className).toBe("card");
    expect(el.id).toBe("main");
  });

  it("applies reactive class prop", () => {
    const active = signal(false);
    const node = h("div", { class: () => (active.value ? "on" : "off") });
    dispose = mount(node, container);

    expect(container.firstElementChild!.className).toBe("off");

    active.value = true;
    expect(container.firstElementChild!.className).toBe("on");
  });

  // ── Array-form class prop (WHISQ-97, option B) ────────────────────────────

  it("accepts a static class array and joins with spaces", () => {
    const node = h("div", { class: ["btn", "primary"] });
    dispose = mount(node, container);
    expect(container.firstElementChild!.className).toBe("btn primary");
  });

  it("filters falsy values from a static class array", () => {
    const node = h("div", {
      class: ["btn", false, null, undefined, 0, "", "primary"],
    });
    dispose = mount(node, container);
    expect(container.firstElementChild!.className).toBe("btn primary");
  });

  it("supports the `cond && 'active'` shorthand in class array", () => {
    const isActive = true;
    const isDisabled = false;
    const node = h("div", {
      class: ["btn", isActive && "active", isDisabled && "disabled"],
    });
    dispose = mount(node, container);
    expect(container.firstElementChild!.className).toBe("btn active");
  });

  it("applies a class array reactively when any source is a function", () => {
    const variant = signal<"primary" | "secondary">("primary");
    const loading = signal(false);
    const node = h("div", {
      class: [
        "btn",
        () => `btn-${variant.value}`,
        () => loading.value && "btn-loading",
      ],
    });
    dispose = mount(node, container);

    expect(container.firstElementChild!.className).toBe("btn btn-primary");

    variant.value = "secondary";
    expect(container.firstElementChild!.className).toBe("btn btn-secondary");

    loading.value = true;
    expect(container.firstElementChild!.className).toBe(
      "btn btn-secondary btn-loading",
    );
  });

  it("filters falsy returns from reactive sources in a class array", () => {
    const show = signal(false);
    const node = h("div", {
      class: ["base", () => (show.value ? "on" : null)],
    });
    dispose = mount(node, container);

    expect(container.firstElementChild!.className).toBe("base");

    show.value = true;
    expect(container.firstElementChild!.className).toBe("base on");

    show.value = false;
    expect(container.firstElementChild!.className).toBe("base");
  });

  it("treats an empty class array as an empty className", () => {
    const node = h("div", { class: [] });
    dispose = mount(node, container);
    expect(container.firstElementChild!.className).toBe("");
  });

  it("treats an all-falsy class array as an empty className", () => {
    const node = h("div", { class: [false, null, undefined, 0, ""] });
    dispose = mount(node, container);
    expect(container.firstElementChild!.className).toBe("");
  });

  it("does not create a reactive effect for a purely static class array", () => {
    // Cover the common case — static array doesn't leak an effect that
    // would fire on unrelated signal changes. We verify indirectly: the
    // className matches expectation and mutating an unrelated signal in
    // the same frame doesn't affect rendering.
    const unrelated = signal("x");
    const node = h("div", { class: ["btn", "primary"] });
    dispose = mount(node, container);
    expect(container.firstElementChild!.className).toBe("btn primary");
    unrelated.value = "y"; // must not cause any re-read
    expect(container.firstElementChild!.className).toBe("btn primary");
  });

  it("applies reactive style prop", () => {
    const color = signal("red");
    const node = h("div", { style: () => `color: ${color.value}` });
    dispose = mount(node, container);

    expect((container.firstElementChild as HTMLElement).style.cssText).toBe(
      "color: red;",
    );

    color.value = "blue";
    expect((container.firstElementChild as HTMLElement).style.cssText).toBe(
      "color: blue;",
    );
  });

  it("applies hidden prop", () => {
    const hidden = signal(false);
    const node = h("div", { hidden: () => hidden.value }, "text");
    dispose = mount(node, container);

    expect((container.firstElementChild as HTMLElement).hidden).toBe(false);

    hidden.value = true;
    expect((container.firstElementChild as HTMLElement).hidden).toBe(true);
  });

  it("attaches event handlers", () => {
    const fn = vi.fn();
    const node = h("button", { onclick: fn }, "Click");
    dispose = mount(node, container);

    container.querySelector("button")!.click();
    expect(fn).toHaveBeenCalledTimes(1);
  });

  it("removes event listeners on dispose", () => {
    const fn = vi.fn();
    const node = h("button", { onclick: fn }, "Click");
    const el = node.el as HTMLElement;
    dispose = mount(node, container);

    dispose();
    // Dispatch event directly on the element to verify listener was removed
    // (not just that the element was detached from DOM)
    el.dispatchEvent(new MouseEvent("click", { bubbles: true }));
    expect(fn).not.toHaveBeenCalled();
  });

  it("blocks string event handlers", () => {
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
    h("div", { onclick: "alert('xss')" as any });
    expect(warn).toHaveBeenCalledWith(
      expect.stringContaining("Blocked string event handler"),
    );
    warn.mockRestore();
  });

  it("appends text children", () => {
    const node = h("p", null, "Hello ", "World");
    expect(node.el.textContent).toBe("Hello World");
  });

  it("appends WhisqNode children", () => {
    const node = h("div", null, h("span", null, "inner"));
    expect(node.el.textContent).toBe("inner");
    expect((node.el as HTMLElement).querySelector("span")!.textContent).toBe(
      "inner",
    );
  });

  it("handles null/undefined/boolean children gracefully", () => {
    const node = h("div", null, null, undefined, false, true, "visible");
    expect(node.el.textContent).toBe("visible");
  });
});

// ── Named element helpers ──────────────────────────────────────────────────

describe("element helpers", () => {
  it("div() creates a <div>", () => {
    const node = div("content");
    expect((node.el as HTMLElement).tagName).toBe("DIV");
    expect(node.el.textContent).toBe("content");
  });

  it("button() with props and children", () => {
    const node = button({ class: "btn" }, "Click me");
    expect((node.el as HTMLElement).tagName).toBe("BUTTON");
    expect((node.el as HTMLElement).className).toBe("btn");
    expect(node.el.textContent).toBe("Click me");
  });

  it("detects first arg as child when not a props object", () => {
    // String first arg = child
    const node1 = span("text");
    expect(node1.el.textContent).toBe("text");

    // WhisqNode first arg = child
    const inner = p("inner");
    const node2 = div(inner);
    expect(node2.el.textContent).toBe("inner");

    // Number first arg = child
    const node3 = span(42 as any);
    expect(node3.el.textContent).toBe("42");
  });

  it("a() creates anchor with href", () => {
    const node = a({ href: "https://example.com" }, "Link");
    const el = node.el as HTMLAnchorElement;
    expect(el.tagName).toBe("A");
    expect(el.getAttribute("href")).toBe("https://example.com");
  });

  it("input() creates input with type and value", () => {
    const node = input({
      type: "text",
      value: "hello",
      placeholder: "Type...",
    });
    const el = node.el as HTMLInputElement;
    expect(el.tagName).toBe("INPUT");
    expect(el.type).toBe("text");
    expect(el.value).toBe("hello");
    expect(el.placeholder).toBe("Type...");
  });

  it("input() with reactive value", () => {
    const val = signal("initial");
    const node = input({ value: () => val.value });
    dispose = mount(node, container);

    const el = container.querySelector("input")!;
    expect(el.value).toBe("initial");

    val.value = "updated";
    expect(el.value).toBe("updated");
  });
});

// ── Reactive children ──────────────────────────────────────────────────────

describe("reactive children", () => {
  it("function child renders and updates", () => {
    const name = signal("Alice");
    const node = div(() => `Hello ${name.value}`);
    dispose = mount(node, container);

    expect(container.textContent).toBe("Hello Alice");

    name.value = "Bob";
    expect(container.textContent).toBe("Hello Bob");
  });

  it("function child returning null renders nothing", () => {
    const show = signal(false);
    const node = div("before", () => (show.value ? "visible" : null), "after");
    dispose = mount(node, container);

    expect(container.textContent).toBe("beforeafter");

    show.value = true;
    expect(container.textContent).toBe("beforevisibleafter");
  });

  it("function child returning WhisqNode", () => {
    const bold = signal(false);
    const node = div(() => (bold.value ? strong("Bold!") : span("Normal")));
    dispose = mount(node, container);

    expect(container.querySelector("span")!.textContent).toBe("Normal");

    bold.value = true;
    expect(container.querySelector("strong")).not.toBeNull();
  });

  it("array children", () => {
    const node = ul([li("a"), li("b"), li("c")]);
    expect(node.el.childNodes.length).toBe(3);
    expect(node.el.textContent).toBe("abc");
  });
});

// ── when() ─────────────────────────────────────────────────────────────────

describe("when()", () => {
  it("renders 'then' branch when condition is true", () => {
    const loggedIn = signal(true);
    const node = div(
      when(
        () => loggedIn.value,
        () => p("Welcome!"),
        () => p("Please log in"),
      ),
    );
    dispose = mount(node, container);

    expect(container.textContent).toBe("Welcome!");
  });

  it("renders 'otherwise' branch when condition is false", () => {
    const loggedIn = signal(false);
    const node = div(
      when(
        () => loggedIn.value,
        () => p("Welcome!"),
        () => p("Please log in"),
      ),
    );
    dispose = mount(node, container);

    expect(container.textContent).toBe("Please log in");
  });

  it("switches on signal change", () => {
    const flag = signal(false);
    const node = div(
      when(
        () => flag.value,
        () => span("ON"),
        () => span("OFF"),
      ),
    );
    dispose = mount(node, container);

    expect(container.textContent).toBe("OFF");

    flag.value = true;
    expect(container.textContent).toBe("ON");

    flag.value = false;
    expect(container.textContent).toBe("OFF");
  });

  it("handles no otherwise branch", () => {
    const show = signal(false);
    const node = div(
      when(
        () => show.value,
        () => p("Visible"),
      ),
    );
    dispose = mount(node, container);

    expect(container.textContent).toBe("");

    show.value = true;
    expect(container.textContent).toBe("Visible");
  });
});

// ── raw() ──────────────────────────────────────────────────────────────────

describe("raw()", () => {
  it("renders static HTML string", () => {
    const node = div(raw("<b>Bold</b> text"));
    dispose = mount(node, container);

    expect(container.querySelector("b")!.textContent).toBe("Bold");
    expect(container.textContent).toBe("Bold text");
  });

  it("renders reactive HTML string", () => {
    const html = signal("<em>italic</em>");
    const node = div(raw(() => html.value));
    dispose = mount(node, container);

    expect(container.querySelector("em")!.textContent).toBe("italic");

    html.value = "<strong>bold</strong>";
    expect(container.querySelector("strong")!.textContent).toBe("bold");
    expect(container.querySelector("em")).toBeNull();
  });
});

// ── mount() ────────────────────────────────────────────────────────────────

describe("mount()", () => {
  it("clears container and appends node", () => {
    container.textContent = "old content";
    const node = div("new content");
    dispose = mount(node, container);

    expect(container.textContent).toBe("new content");
  });

  it("returns dispose function that cleans up", () => {
    const node = div("content");
    dispose = mount(node, container);

    expect(container.textContent).toBe("content");

    dispose();
    expect(container.textContent).toBe("");
  });

  it("dispose stops reactive updates", () => {
    const count = signal(0);
    const node = div(() => `Count: ${count.value}`);
    dispose = mount(node, container);

    expect(container.textContent).toBe("Count: 0");

    dispose();
    count.value = 99;
    // After dispose, updates should not affect the DOM
    // (container was cleared by dispose)
    expect(container.textContent).toBe("");
  });
});
