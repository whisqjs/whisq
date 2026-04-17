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
