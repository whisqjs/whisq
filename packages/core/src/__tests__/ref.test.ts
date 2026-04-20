import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { signal, isSignal } from "../reactive.js";
import { div, input, button, mount } from "../elements.js";
import { ref } from "../ref.js";
import type { ElementRef } from "../ref.js";

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

describe("ref prop", () => {
  describe("signal ref", () => {
    it("sets signal value to the DOM element after creation", () => {
      const elRef = signal<HTMLElement | null>(null);
      const node = div({ ref: elRef });
      dispose = mount(node, container);

      expect(elRef.value).toBeInstanceOf(HTMLDivElement);
      expect(elRef.value).toBe(container.firstElementChild);
    });

    it("sets signal to null on dispose", () => {
      const elRef = signal<HTMLElement | null>(null);
      const node = div({ ref: elRef });
      dispose = mount(node, container);

      expect(elRef.value).toBeInstanceOf(HTMLDivElement);

      dispose();
      expect(elRef.value).toBeNull();
    });

    it("works with typed input element", () => {
      const inputRef = signal<HTMLInputElement | null>(null);
      const node = input({ ref: inputRef, type: "text", placeholder: "Name" });
      dispose = mount(node, container);

      expect(inputRef.value).toBeInstanceOf(HTMLInputElement);
      expect(inputRef.value!.type).toBe("text");
      expect(inputRef.value!.placeholder).toBe("Name");
    });
  });

  describe("callback ref", () => {
    it("calls function with the DOM element after creation", () => {
      let captured: HTMLElement | null = null;
      const node = div({
        ref: (el) => {
          captured = el;
        },
      });
      dispose = mount(node, container);

      expect(captured).toBeInstanceOf(HTMLDivElement);
      expect(captured).toBe(container.firstElementChild);
    });

    it("calls function with null on dispose", () => {
      let captured: HTMLElement | null = null;
      const node = div({
        ref: (el) => {
          captured = el;
        },
      });
      dispose = mount(node, container);

      expect(captured).toBeInstanceOf(HTMLDivElement);

      dispose();
      expect(captured).toBeNull();
    });
  });

  describe("ref with children", () => {
    it("ref does not interfere with children rendering", () => {
      const elRef = signal<HTMLElement | null>(null);
      const node = div({ ref: elRef, class: "wrapper" }, button("Click me"));
      dispose = mount(node, container);

      expect(elRef.value).toBeInstanceOf(HTMLDivElement);
      expect(elRef.value!.className).toBe("wrapper");
      expect(elRef.value!.querySelector("button")!.textContent).toBe(
        "Click me",
      );
    });
  });
});

describe("ref() helper", () => {
  it("returns a Signal", () => {
    const r = ref<HTMLInputElement>();
    expect(isSignal(r)).toBe(true);
  });

  it("initializes to null", () => {
    const r = ref<HTMLInputElement>();
    expect(r.value).toBeNull();
  });

  it("populates on mount when used as an element ref", () => {
    const inputRef = ref<HTMLInputElement>();
    dispose = mount(input({ ref: inputRef, type: "text" }), container);
    expect(inputRef.value).toBeInstanceOf(HTMLInputElement);
    expect(inputRef.value!.type).toBe("text");
  });

  it("resets to null on dispose", () => {
    const inputRef = ref<HTMLInputElement>();
    dispose = mount(input({ ref: inputRef }), container);
    expect(inputRef.value).toBeInstanceOf(HTMLInputElement);
    dispose();
    expect(inputRef.value).toBeNull();
  });

  it("is typed to the requested element", () => {
    // Compile-time assertion: ref<HTMLInputElement>() typed as Signal<HTMLInputElement | null>
    const r = ref<HTMLInputElement>();
    dispose = mount(input({ ref: r }), container);
    // .focus is HTMLInputElement-specific; this line only typechecks if r.value narrows correctly.
    r.value?.focus();
    expect(document.activeElement).toBe(r.value);
  });

  it("defaults element type to HTMLElement when unspecified", () => {
    const r = ref();
    dispose = mount(div({ ref: r }), container);
    expect(r.value).toBeInstanceOf(HTMLDivElement);
  });

  // ── Accessor contract (WHISQ-63) ──────────────────────────────────────

  it("uses .value as the accessor — not .current", () => {
    const r = ref<HTMLInputElement>();
    // `.current` is React's convention, not Whisq's. Verify the property
    // doesn't exist so it's loud if anyone ever adds it.
    expect("current" in r).toBe(false);
    // The documented accessors all exist on a regular Signal.
    expect(typeof r.value === "object" || r.value === null).toBe(true);
    expect(typeof r.peek).toBe("function");
    expect(typeof r.subscribe).toBe("function");
  });

  it("returns a signal, so isSignal(ref()) === true", () => {
    const r = ref<HTMLInputElement>();
    expect(isSignal(r)).toBe(true);
  });

  it("subscribe() fires on mount and unmount", () => {
    const r = ref<HTMLInputElement>();
    const seen: (HTMLInputElement | null)[] = [];
    const unsubscribe = r.subscribe((v) => seen.push(v));

    dispose = mount(input({ ref: r }), container);
    dispose();
    unsubscribe();

    // Initial immediate null + populate on mount + reset to null on unmount.
    expect(seen.length).toBeGreaterThanOrEqual(3);
    expect(seen[0]).toBeNull();
    expect(seen.find((v) => v instanceof HTMLInputElement)).toBeInstanceOf(
      HTMLInputElement,
    );
    expect(seen[seen.length - 1]).toBeNull();
  });
});

// ── ElementRef<T> type alias (WHISQ-63) ────────────────────────────────

describe("ElementRef<T>", () => {
  it("is assignable to the Ref prop type (signal form)", () => {
    // Compile-time assertion: declaring via the alias produces a value
    // that satisfies the element `ref` prop.
    const r: ElementRef<HTMLInputElement> = ref<HTMLInputElement>();
    dispose = mount(input({ ref: r }), container);
    expect(r.value).toBeInstanceOf(HTMLInputElement);
  });

  it("is structurally identical to Signal<T | null>", () => {
    const r: ElementRef<HTMLInputElement> = signal<HTMLInputElement | null>(
      null,
    );
    dispose = mount(input({ ref: r }), container);
    expect(r.value).toBeInstanceOf(HTMLInputElement);
  });
});
