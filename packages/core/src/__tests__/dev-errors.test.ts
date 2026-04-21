import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { signal } from "../reactive.js";
import { div, each, ul, mount, component } from "../elements.js";
import { WhisqStructureError, describeValue } from "../dev-errors.js";
import { component as makeComponent } from "../component.js";

// Re-export `component` works either way — the `component` is re-exported
// from elements in some builds. Use `makeComponent` in tests for clarity.
void component;

let container: HTMLElement;
let dispose: (() => void) | undefined;

beforeEach(() => {
  container = document.createElement("div");
  document.body.appendChild(container);
});

afterEach(() => {
  if (dispose) dispose();
  container.remove();
  dispose = undefined;
});

describe("WhisqStructureError — describeValue", () => {
  it("names primitives by type + value", () => {
    expect(describeValue(null)).toBe("null");
    expect(describeValue(undefined)).toBe("undefined");
    expect(describeValue(42)).toContain("42");
    expect(describeValue(true)).toContain("true");
    expect(describeValue("hi")).toContain("hi");
    expect(describeValue(() => {})).toBe("function");
  });

  it("names arrays by length", () => {
    expect(describeValue([1, 2, 3])).toBe("array (length 3)");
    expect(describeValue([])).toBe("array (length 0)");
  });

  it("names plain objects and class instances distinctly", () => {
    expect(describeValue({ a: 1 })).toBe("plain object");
    class Foo {}
    expect(describeValue(new Foo())).toBe("Foo instance");
  });
});

describe("WhisqStructureError — message shape", () => {
  it("composes element + expected + received + hint", () => {
    const err = new WhisqStructureError({
      element: "each",
      expected: "items() to return an array",
      received: "undefined",
      hint: "Gate the list with when().",
    });
    expect(err.name).toBe("WhisqStructureError");
    expect(err.message).toContain("each");
    expect(err.message).toContain("items() to return an array");
    expect(err.message).toContain("undefined");
    expect(err.message).toContain("Hint: Gate the list with when().");
  });

  it("preserves structured fields for programmatic handling", () => {
    const err = new WhisqStructureError({
      element: "div",
      expected: "WhisqNode",
      received: "plain object",
    });
    expect(err.element).toBe("div");
    expect(err.expected).toBe("WhisqNode");
    expect(err.received).toBe("plain object");
    expect(err.hint).toBeUndefined();
  });
});

// ── Fixture 1: each() with non-array items() return ────────────────────────

describe("each() — items() must return an array", () => {
  it("throws a friendly WhisqStructureError when items() returns undefined (was: .map is not a function)", () => {
    const maybe = signal<number[] | undefined>(undefined);
    let caught: unknown;
    try {
      dispose = mount(
        ul(
          each(
            () => maybe.value as unknown as number[],
            (n) => ul(String(n)),
          ),
        ),
        container,
      );
    } catch (e) {
      caught = e;
    }
    expect(caught).toBeInstanceOf(WhisqStructureError);
    expect((caught as WhisqStructureError).element).toBe("each");
    expect((caught as WhisqStructureError).received).toBe("undefined");
    expect((caught as Error).message).toMatch(/items\(\) to return an array/);
    expect((caught as Error).message).toMatch(/Hint:/);
  });

  it("throws when items() returns a plain object (e.g., user passed a Map)", () => {
    expect(() => {
      dispose = mount(
        ul(
          each(
            () => ({ a: 1, b: 2 }) as unknown as number[],
            (n) => ul(String(n)),
          ),
        ),
        container,
      );
    }).toThrow(WhisqStructureError);
  });

  it("throws when items is not a function (user passed the array directly)", () => {
    expect(() => {
      each([1, 2, 3] as unknown as () => number[], (n) => ul(String(n)));
    }).toThrow(/items to be a function/);
  });

  it("accepts a valid items() return (sanity check — no throw)", () => {
    const items = signal([1, 2, 3]);
    expect(() => {
      dispose = mount(
        ul(
          each(
            () => items.value,
            (n) => ul(String(n)),
          ),
        ),
        container,
      );
    }).not.toThrow();
  });
});

// ── Fixture 2: malformed child (plain object) ──────────────────────────────

describe("appendChildren — plain-object child", () => {
  it("throws a friendly WhisqStructureError naming the element (was: silent drop)", () => {
    let caught: unknown;
    try {
      // Simulate a user who forgot to call the component: `div({}, MyComponent)`
      // where MyComponent is a plain object rather than a function / WhisqNode.
      dispose = mount(
        div({} as never, { not: "a whisq node" } as never),
        container,
      );
    } catch (e) {
      caught = e;
    }
    expect(caught).toBeInstanceOf(WhisqStructureError);
    expect((caught as WhisqStructureError).element).toBe("div");
    expect((caught as WhisqStructureError).received).toBe("plain object");
    expect((caught as Error).message).toMatch(/Plain objects can't be rendered/);
  });
});

// ── Fixture 3: component setup returns wrong shape ─────────────────────────

describe("component — setup must return a WhisqNode", () => {
  it("throws a friendly WhisqStructureError when setup returns null (was: downstream crash at dispose)", () => {
    const Broken = makeComponent(() => null as never);
    let caught: unknown;
    try {
      dispose = mount(Broken({}), container);
    } catch (e) {
      caught = e;
    }
    expect(caught).toBeInstanceOf(WhisqStructureError);
    expect((caught as WhisqStructureError).element).toBe("component");
    expect((caught as WhisqStructureError).received).toBe("null");
    expect((caught as Error).message).toMatch(/return a WhisqNode/);
  });

  it("throws when setup returns a bare string", () => {
    const Stringly = makeComponent(() => "just a string" as never);
    expect(() => {
      dispose = mount(Stringly({}), container);
    }).toThrow(WhisqStructureError);
  });

  it("does not throw for valid components (regression guard)", () => {
    const Good = makeComponent(() => div("hi"));
    expect(() => {
      dispose = mount(Good({}), container);
    }).not.toThrow();
  });
});
