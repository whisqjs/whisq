import { describe, it, expect } from "vitest";
import { queryApi } from "../tools/api-docs.js";

describe("queryApi", () => {
  it("returns overview for 'overview' topic", () => {
    const result = queryApi("overview");
    expect(result.topic).toBe("overview");
    expect(result.content).toContain("Whisq API Overview");
  });

  it("returns signals docs", () => {
    const result = queryApi("signals");
    expect(result.topic).toBe("signals");
    expect(result.content).toContain("signal(");
    expect(result.content).toContain("computed(");
  });

  describe("signals topic — load-bearing phrases after migration to enriched manifest (WHISQ-138)", () => {
    // The signals topic is now generated from the @whisq/core enriched
    // manifest rather than hand-written. These assertions pin the phrases
    // consumers have depended on so a metadata edit can't silently drop them.
    const content = queryApi("signals").content;

    it("keeps the top-level '# Signals' heading", () => {
      expect(content).toMatch(/^# Signals/);
    });

    it("covers the four core reactive primitives in their signature form", () => {
      for (const snippet of [
        "signal<T>(initial: T)",
        "computed<T>(fn: () => T)",
        "effect(fn:",
        "batch(fn:",
      ]) {
        expect(content).toContain(snippet);
      }
    });

    it("keeps the canonical usage phrases that API consumers grep for", () => {
      for (const phrase of [
        ".value",
        "peek()",
        "count.update",
        "computed(() =>",
        "batch(() =>",
      ]) {
        expect(content).toContain(phrase);
      }
    });

    it("surfaces the array-mutation and stale-child gotchas (the two top signal footguns)", () => {
      expect(content).toMatch(/items\.value\.push.*does not trigger/i);
      expect(content).toMatch(/captures the value once/i);
    });

    it("links related primitives via See also", () => {
      expect(content).toContain("**See also:**");
      expect(content).toContain("computed");
      expect(content).toContain("effect");
      expect(content).toContain("batch");
    });
  });

  it("returns elements docs", () => {
    const result = queryApi("elements");
    expect(result.content).toContain("div(");
    expect(result.content).toContain("when(");
    expect(result.content).toContain("each(");
  });

  it("returns components docs", () => {
    const result = queryApi("components");
    expect(result.content).toContain("component(");
    expect(result.content).toContain("onMount(");
  });

  it("returns routing docs", () => {
    const result = queryApi("routing");
    expect(result.content).toContain("createRouter");
    expect(result.content).toContain("RouterView");
  });

  it("handles alias 'state' -> signals", () => {
    const result = queryApi("state");
    expect(result.topic).toBe("signals");
  });

  it("handles alias 'router' -> routing", () => {
    const result = queryApi("router");
    expect(result.topic).toBe("routing");
  });

  it("handles alias 'css' -> styling", () => {
    const result = queryApi("css");
    expect(result.topic).toBe("styling");
  });

  it("handles case insensitivity", () => {
    const result = queryApi("SIGNALS");
    expect(result.topic).toBe("signals");
  });

  it("returns unknown for invalid topic", () => {
    const result = queryApi("blockchain");
    expect(result.topic).toBe("unknown");
    expect(result.content).toContain("not found");
    expect(result.content).toContain("Available topics");
  });

  it("returns all documented topics", () => {
    const topics = [
      "signals",
      "elements",
      "components",
      "routing",
      "styling",
      "forms",
      "lists",
      "async",
      "ssr",
      "testing",
      "overview",
    ];
    for (const topic of topics) {
      const result = queryApi(topic);
      expect(result.topic).toBe(topic);
      expect(result.content.length).toBeGreaterThan(50);
    }
  });
});
