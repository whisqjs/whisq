import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { signal } from "../reactive.js";
import { div, input, button, mount } from "../elements.js";

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
