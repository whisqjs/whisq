import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { signal } from "../reactive.js";
import { div, mount } from "../elements.js";
import { sx } from "../styling.js";

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

describe("style prop — object form", () => {
  it("applies static properties on mount", () => {
    const node = div({ style: { color: "red", padding: "1rem" } });
    dispose = mount(node, container);

    const el = container.firstElementChild as HTMLElement;
    expect(el.style.color).toBe("red");
    expect(el.style.padding).toBe("1rem");
  });

  it("reactively updates a property when its signal changes", () => {
    const color = signal("red");
    const node = div({ style: { color: () => color.value } });
    dispose = mount(node, container);

    const el = container.firstElementChild as HTMLElement;
    expect(el.style.color).toBe("red");

    color.value = "blue";
    expect(el.style.color).toBe("blue");
  });

  it("updates only the changed property, not others", () => {
    const color = signal("red");
    const padding = signal("1rem");
    const node = div({
      style: {
        color: () => color.value,
        padding: () => padding.value,
      },
    });
    dispose = mount(node, container);
    const el = container.firstElementChild as HTMLElement;

    color.value = "blue";
    expect(el.style.color).toBe("blue");
    expect(el.style.padding).toBe("1rem");
  });

  it("mixes static and reactive properties", () => {
    const x = signal(10);
    const node = div({
      style: {
        color: "red",
        transform: () => `translateX(${x.value}px)`,
      },
    });
    dispose = mount(node, container);
    const el = container.firstElementChild as HTMLElement;

    expect(el.style.color).toBe("red");
    expect(el.style.transform).toBe("translateX(10px)");
    x.value = 20;
    expect(el.style.transform).toBe("translateX(20px)");
  });

  it("converts camelCase keys to kebab-case", () => {
    const node = div({
      style: { backgroundColor: "yellow", borderRadius: "4px" },
    });
    dispose = mount(node, container);
    const el = container.firstElementChild as HTMLElement;
    expect(el.style.backgroundColor).toBe("yellow");
    expect(el.style.borderRadius).toBe("4px");
  });

  it("accepts kebab-case keys directly", () => {
    const node = div({ style: { "background-color": "yellow" } });
    dispose = mount(node, container);
    const el = container.firstElementChild as HTMLElement;
    expect(el.style.backgroundColor).toBe("yellow");
  });

  it("passes CSS custom properties through unchanged", () => {
    const accent = signal("#5ce0f2");
    const node = div({ style: { "--accent": () => accent.value } });
    dispose = mount(node, container);
    const el = container.firstElementChild as HTMLElement;
    expect(el.style.getPropertyValue("--accent")).toBe("#5ce0f2");
    accent.value = "#4F46E5";
    expect(el.style.getPropertyValue("--accent")).toBe("#4F46E5");
  });

  it("removes the property when the getter returns undefined", () => {
    const color = signal<string | undefined>("red");
    const node = div({ style: { color: () => color.value } });
    dispose = mount(node, container);
    const el = container.firstElementChild as HTMLElement;

    expect(el.style.color).toBe("red");
    color.value = undefined;
    expect(el.style.color).toBe("");
  });

  it("removes the property when the getter returns empty string", () => {
    const pad = signal("1rem");
    const node = div({ style: { padding: () => pad.value } });
    dispose = mount(node, container);
    const el = container.firstElementChild as HTMLElement;

    pad.value = "";
    expect(el.style.padding).toBe("");
  });

  it("coerces numeric values to string", () => {
    const op = signal(1);
    const node = div({
      style: {
        opacity: () => op.value,
        zIndex: 5,
      },
    });
    dispose = mount(node, container);
    const el = container.firstElementChild as HTMLElement;

    expect(el.style.opacity).toBe("1");
    expect(el.style.zIndex).toBe("5");
    op.value = 0;
    expect(el.style.opacity).toBe("0");
  });

  it("skips null and empty-string static entries without error", () => {
    const node = div({
      style: {
        color: "red",
        padding: null,
        margin: "",
      },
    });
    dispose = mount(node, container);
    const el = container.firstElementChild as HTMLElement;

    expect(el.style.color).toBe("red");
    expect(el.style.padding).toBe("");
    expect(el.style.margin).toBe("");
  });

  // Regression checks — make sure the existing forms still work.

  it("regression — static string form still sets cssText", () => {
    const node = div({ style: "color: red; padding: 1rem" });
    dispose = mount(node, container);
    const el = container.firstElementChild as HTMLElement;
    expect(el.style.color).toBe("red");
    expect(el.style.padding).toBe("1rem");
  });

  it("regression — reactive string form still updates", () => {
    const c = signal("red");
    const node = div({ style: () => `color: ${c.value}` });
    dispose = mount(node, container);
    const el = container.firstElementChild as HTMLElement;

    expect(el.style.color).toBe("red");
    c.value = "blue";
    expect(el.style.color).toBe("blue");
  });
});

describe("sx() — style composition", () => {
  it("merges multiple objects, later wins", () => {
    expect(sx({ a: "1", b: "2" }, { b: "3", c: "4" })).toEqual({
      a: "1",
      b: "3",
      c: "4",
    });
  });

  it("ignores false / null / undefined args", () => {
    expect(sx({ a: "1" }, false, null, undefined, { b: "2" })).toEqual({
      a: "1",
      b: "2",
    });
  });

  it("preserves function values without invoking them", () => {
    const getter = () => "red";
    const merged = sx({ color: getter });
    expect(merged.color).toBe(getter);
  });

  it("supports the conditional `cond && {...}` pattern", () => {
    const active = true;
    const merged = sx({ color: "red" }, active && { borderColor: "blue" }, {
      padding: "1rem",
    });
    expect(merged).toEqual({
      color: "red",
      borderColor: "blue",
      padding: "1rem",
    });
  });

  it("integrates with the style prop (composition end-to-end)", () => {
    const active = signal(true);
    const node = div({
      style: sx({ color: "red" }, active.value && { borderColor: "blue" }, {
        padding: () => (active.value ? "1rem" : "0"),
      }),
    });
    dispose = mount(node, container);
    const el = container.firstElementChild as HTMLElement;

    expect(el.style.color).toBe("red");
    expect(el.style.borderColor).toBe("blue");
    expect(el.style.padding).toBe("1rem");
  });
});
