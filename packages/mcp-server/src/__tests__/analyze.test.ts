import { describe, it, expect } from "vitest";
import { analyzeProject } from "../tools/analyze.js";

describe("analyzeProject", () => {
  it("detects signal usage", () => {
    const result = analyzeProject(`
      const count = signal(0);
      const name = signal("hello");
    `);

    const signalPattern = result.patterns.find((p) => p.name === "signals");
    expect(signalPattern?.found).toBe(true);
    expect(signalPattern?.count).toBe(2);
  });

  it("detects component pattern", () => {
    const result = analyzeProject(`
      const App = component(() => div("Hello"));
    `);

    expect(result.patterns.find((p) => p.name === "components")?.found).toBe(
      true,
    );
  });

  it("detects multiple patterns", () => {
    const result = analyzeProject(`
      const count = signal(0);
      const doubled = computed(() => count.value * 2);
      const App = component(() => {
        onMount(() => console.log("hi"));
        return div(
          when(() => count.value > 0, () => p("positive")),
          each(() => items.value, (i) => li(i)),
        );
      });
      mount(App({}), el);
    `);

    const found = result.patterns.filter((p) => p.found).map((p) => p.name);
    expect(found).toContain("signals");
    expect(found).toContain("computed values");
    expect(found).toContain("components");
    expect(found).toContain("onMount hooks");
    expect(found).toContain("conditional rendering (when)");
    expect(found).toContain("list rendering (each)");
    expect(found).toContain("mount calls");
  });

  it("suggests computed when only signals are used", () => {
    const result = analyzeProject(`
      const count = signal(0);
    `);

    expect(result.suggestions.some((s) => s.includes("computed()"))).toBe(true);
  });

  it("suggests sheet when signals are used without styling", () => {
    const result = analyzeProject(`
      const count = signal(0);
    `);

    expect(result.suggestions.some((s) => s.includes("sheet()"))).toBe(true);
  });

  it("suggests resource when fetch is used without resource()", () => {
    const result = analyzeProject(`
      fetch("/api/users").then(r => r.json());
    `);

    expect(result.suggestions.some((s) => s.includes("resource()"))).toBe(true);
  });

  it("returns empty patterns for non-whisq code", () => {
    const result = analyzeProject(`
      console.log("hello world");
    `);

    const found = result.patterns.filter((p) => p.found);
    expect(found).toHaveLength(0);
    expect(result.summary).toContain("No Whisq patterns detected");
  });

  it("generates meaningful summary", () => {
    const result = analyzeProject(`
      const count = signal(0);
      const App = component(() => div("hi"));
    `);

    expect(result.summary).toContain("Found");
    expect(result.summary).toContain("signals");
    expect(result.summary).toContain("components");
  });

  it("handles empty input", () => {
    const result = analyzeProject("");
    expect(result.patterns).toBeTruthy();
    expect(result.suggestions).toBeTruthy();
  });
});
