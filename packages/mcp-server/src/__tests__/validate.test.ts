import { describe, it, expect } from "vitest";
import { validateCode } from "../tools/validate.js";

describe("validateCode", () => {
  it("passes clean code", () => {
    const result = validateCode(`
import { signal, component, div, span, button } from "@whisq/core";

const Counter = component(() => {
  const count = signal(0);
  return div(
    button({ onclick: () => count.value++ }, "+"),
    span(() => String(count.value)),
  );
});
    `);

    expect(result.valid).toBe(true);
    expect(result.issues).toHaveLength(0);
  });

  it("detects bare .value in children", () => {
    const result = validateCode(`span(count.value)`);
    expect(result.valid).toBe(false);
    expect(result.issues[0].message).toContain("Bare .value as child");
  });

  it("detects .push() mutation on signal", () => {
    const result = validateCode(`items.value.push(newItem)`);
    expect(result.valid).toBe(false);
    expect(result.issues[0].message).toContain(".push()");
  });

  it("detects .pop() mutation on signal", () => {
    const result = validateCode(`items.value.pop()`);
    expect(result.valid).toBe(false);
    expect(result.issues[0].message).toContain(".pop()");
  });

  it("detects .sort() mutation on signal", () => {
    const result = validateCode(`items.value.sort((a, b) => a - b)`);
    expect(result.valid).toBe(false);
    expect(result.issues[0].message).toContain(".sort()");
  });

  it("detects .reverse() mutation on signal", () => {
    const result = validateCode(`items.value.reverse()`);
    expect(result.valid).toBe(false);
    expect(result.issues[0].message).toContain(".reverse()");
  });

  it("detects JSX syntax", () => {
    const result = validateCode(`return <Component />`);
    expect(result.valid).toBe(false);
    expect(result.issues[0].message).toContain("JSX");
  });

  it("detects string event handlers", () => {
    const result = validateCode(`onclick="alert('xss')"`);
    expect(result.valid).toBe(false);
    expect(result.issues[0].message).toContain("String event handler");
  });

  it("warns about this keyword", () => {
    const result = validateCode(`this.count = 0;`);
    expect(result.valid).toBe(true);
    expect(result.issues[0].severity).toBe("warning");
  });

  it("detects class components", () => {
    const result = validateCode(
      `class MyComponent extends Component { render() {} }`,
    );
    expect(result.valid).toBe(false);
    expect(result.issues[0].message).toContain("function components");
  });

  it("warns about direct DOM queries", () => {
    const result = validateCode(`document.getElementById("app")`);
    expect(result.valid).toBe(true);
    expect(result.issues[0].severity).toBe("warning");
    expect(result.issues[0].message).toContain("DOM queries");
  });

  // Note: innerHTML and addEventListener tests verify the validator
  // DETECTS these patterns as warnings — the test strings are not executed
  it("warns about unsafe DOM manipulation", () => {
    const result = validateCode(`el.innerHTML = content`);
    expect(result.valid).toBe(true);
    expect(result.issues[0].message).toContain("innerHTML");
  });

  it("warns about addEventListener", () => {
    const result = validateCode(`el.addEventListener("click", handler)`);
    expect(result.valid).toBe(true);
    expect(result.issues[0].message).toContain("addEventListener");
  });

  it("reports correct line numbers", () => {
    const result = validateCode(`line1
line2
items.value.push(x)
line4`);
    expect(result.issues[0].line).toBe(3);
  });
});
