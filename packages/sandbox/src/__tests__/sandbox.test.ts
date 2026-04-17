import { describe, it, expect } from "vitest";
import { createSandbox } from "../index.js";

describe("createSandbox", () => {
  it("executes simple expression and returns result", async () => {
    const sandbox = createSandbox();
    const result = await sandbox.execute("return 1 + 1");
    expect(result).toEqual({ success: true, value: 2 });
    sandbox.dispose();
  });

  it("executes string expressions", async () => {
    const sandbox = createSandbox();
    const result = await sandbox.execute('return "hello" + " " + "world"');
    expect(result).toEqual({ success: true, value: "hello world" });
    sandbox.dispose();
  });

  it("handles runtime errors gracefully", async () => {
    const sandbox = createSandbox();
    const result = await sandbox.execute("throw new Error('boom')");
    expect(result.success).toBe(false);
    expect(result.error).toContain("boom");
    sandbox.dispose();
  });

  it("handles syntax errors", async () => {
    const sandbox = createSandbox();
    const result = await sandbox.execute("return {{{");
    expect(result.success).toBe(false);
    expect(result.error).toBeDefined();
    sandbox.dispose();
  });

  it("enforces timeout on async code", async () => {
    const sandbox = createSandbox({ timeout: 50 });
    const result = await sandbox.execute(
      "return new Promise(r => setTimeout(r, 10000))",
    );
    expect(result.success).toBe(false);
    expect(result.error).toContain("timeout");
    sandbox.dispose();
  });

  it("blocks access to global objects", async () => {
    const sandbox = createSandbox();

    const r1 = await sandbox.execute("return typeof document");
    expect(r1).toEqual({ success: true, value: "undefined" });

    const r2 = await sandbox.execute("return typeof window");
    expect(r2).toEqual({ success: true, value: "undefined" });

    const r3 = await sandbox.execute("return typeof fetch");
    expect(r3).toEqual({ success: true, value: "undefined" });

    const r4 = await sandbox.execute("return typeof localStorage");
    expect(r4).toEqual({ success: true, value: "undefined" });

    sandbox.dispose();
  });

  it("supports message passing via postMessage", async () => {
    const sandbox = createSandbox();
    const received: unknown[] = [];

    sandbox.onMessage((msg) => {
      received.push(msg);
    });

    // Use return to avoid "undefined" issues — postMessage is fire-and-forget
    await sandbox.execute(
      'postMessage({ type: "hello", data: 42 }); return "sent"',
    );

    expect(received).toEqual([{ type: "hello", data: 42 }]);
    sandbox.dispose();
  });

  it("multiple sequential executions", async () => {
    const sandbox = createSandbox();

    const r1 = await sandbox.execute("return 1");
    const r2 = await sandbox.execute("return 2");
    const r3 = await sandbox.execute("return 3");

    expect(r1.value).toBe(1);
    expect(r2.value).toBe(2);
    expect(r3.value).toBe(3);

    sandbox.dispose();
  });

  it("dispose prevents further execution", async () => {
    const sandbox = createSandbox();
    sandbox.dispose();

    const result = await sandbox.execute("return 1");
    expect(result.success).toBe(false);
    expect(result.error).toContain("disposed");
  });

  it("returns undefined for void expressions", async () => {
    const sandbox = createSandbox();
    const result = await sandbox.execute("const x = 5");
    expect(result).toEqual({ success: true, value: undefined });
    sandbox.dispose();
  });
});
