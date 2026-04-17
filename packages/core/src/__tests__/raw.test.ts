import { describe, it, expect } from "vitest";
import { raw, div, mount } from "../index";
import { signal } from "../reactive";

describe("raw()", () => {
  it("renders static HTML string", () => {
    const container = document.createElement("div");
    mount(div(raw("<b>bold</b>")), container);

    expect(container.querySelector("b")).not.toBeNull();
    expect(container.querySelector("b")?.textContent).toBe("bold");
  });

  it("renders multiple elements from a string", () => {
    const container = document.createElement("div");
    mount(div(raw("<span>a</span><span>b</span>")), container);

    const spans = container.querySelectorAll("span");
    expect(spans.length).toBe(2);
    expect(spans[0].textContent).toBe("a");
    expect(spans[1].textContent).toBe("b");
  });

  it("renders nested HTML structures", () => {
    const container = document.createElement("div");
    mount(div(raw("<ul><li>one</li><li>two</li></ul>")), container);

    expect(container.querySelector("ul")).not.toBeNull();
    expect(container.querySelectorAll("li").length).toBe(2);
  });

  it("renders reactive HTML when given a function", () => {
    const content = signal("<b>initial</b>");
    const container = document.createElement("div");
    mount(div(raw(() => content.value)), container);

    expect(container.querySelector("b")?.textContent).toBe("initial");

    content.value = "<em>updated</em>";
    expect(container.querySelector("b")).toBeNull();
    expect(container.querySelector("em")?.textContent).toBe("updated");
  });

  it("handles empty string", () => {
    const container = document.createElement("div");
    mount(div(raw("")), container);

    // Should not throw, container should have the wrapper div
    expect(container.firstChild).not.toBeNull();
  });

  it("renders plain text without tags", () => {
    const container = document.createElement("div");
    mount(div(raw("just text")), container);

    expect(container.textContent).toContain("just text");
  });
});
