import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { signal, component, div, span, mount } from "@whisq/core";
import {
  connectDevTools,
  disconnectDevTools,
  type DevToolsHook,
} from "../index.js";

let dispose: (() => void) | undefined;

beforeEach(() => {
  connectDevTools();
});

afterEach(() => {
  if (dispose) dispose();
  disconnectDevTools();
});

function getHook(): DevToolsHook {
  return (globalThis as any).__WHISQ_DEVTOOLS__ as DevToolsHook;
}

describe("connectDevTools", () => {
  it("installs global hook", () => {
    expect(getHook()).toBeDefined();
    expect(getHook().version).toBe("0.0.1-alpha.0");
  });

  it("tracks registered signals", () => {
    const count = signal(0);

    const hook = getHook();
    hook.registerSignal("count", count);

    const signals = hook.getSignals();
    expect(signals).toHaveLength(1);
    expect(signals[0].name).toBe("count");
    expect(signals[0].value).toBe(0);
  });

  it("signal values update in real-time", () => {
    const count = signal(0);

    const hook = getHook();
    hook.registerSignal("count", count);

    count.value = 42;

    const signals = hook.getSignals();
    expect(signals[0].value).toBe(42);
  });

  it("tracks component mounts", () => {
    const container = document.createElement("div");
    document.body.appendChild(container);

    const hook = getHook();

    const App = component(() => {
      hook.registerComponent("App");
      return div("Hello");
    });

    dispose = mount(App({}), container);

    const components = hook.getComponents();
    expect(components).toContain("App");

    container.remove();
  });

  it("tracks component unmounts", () => {
    const container = document.createElement("div");
    document.body.appendChild(container);

    const hook = getHook();

    const App = component(() => {
      hook.registerComponent("App");
      return div("Hello");
    });

    dispose = mount(App({}), container);
    expect(hook.getComponents()).toContain("App");

    hook.unregisterComponent("App");
    expect(hook.getComponents()).not.toContain("App");

    container.remove();
  });

  it("getSignals returns all registered signals with current values", () => {
    const a = signal(1);
    const b = signal("hello");

    const hook = getHook();
    hook.registerSignal("a", a);
    hook.registerSignal("b", b);

    const signals = hook.getSignals();
    expect(signals).toHaveLength(2);
    expect(signals.find((s) => s.name === "a")?.value).toBe(1);
    expect(signals.find((s) => s.name === "b")?.value).toBe("hello");
  });

  it("disconnectDevTools removes the global", () => {
    expect(getHook()).toBeDefined();
    disconnectDevTools();
    expect((globalThis as any).__WHISQ_DEVTOOLS__).toBeUndefined();
    // Re-connect for afterEach cleanup
    connectDevTools();
  });

  it("reports event log", () => {
    const hook = getHook();
    hook.logEvent("signal:update", { name: "count", value: 42 });
    hook.logEvent("component:mount", { name: "App" });

    const events = hook.getEvents();
    expect(events).toHaveLength(2);
    expect(events[0].type).toBe("signal:update");
    expect(events[1].type).toBe("component:mount");
  });

  it("clearEvents resets the log", () => {
    const hook = getHook();
    hook.logEvent("test", {});
    expect(hook.getEvents()).toHaveLength(1);

    hook.clearEvents();
    expect(hook.getEvents()).toHaveLength(0);
  });
});
