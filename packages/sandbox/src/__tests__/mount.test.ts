// @vitest-environment jsdom
import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { mountSandboxed } from "../index.js";

let container: HTMLElement;

beforeEach(() => {
  container = document.createElement("div");
  document.body.appendChild(container);
});

afterEach(() => {
  container.remove();
});

describe("mountSandboxed() — structure", () => {
  it("mounts an iframe inside the provided container", () => {
    const handle = mountSandboxed({
      source: "// no-op",
      container,
    });
    expect(container.querySelector("iframe")).not.toBeNull();
    expect(handle.iframe.parentElement).toBe(container);
    handle.dispose();
  });

  it("sets sandbox='allow-scripts' by default", () => {
    const handle = mountSandboxed({ source: "", container });
    expect(handle.iframe.getAttribute("sandbox")).toBe("allow-scripts");
    handle.dispose();
  });

  it("accepts a custom sandbox attribute string", () => {
    const handle = mountSandboxed({
      source: "",
      container,
      sandboxAttrs: "allow-scripts allow-forms",
    });
    expect(handle.iframe.getAttribute("sandbox")).toBe(
      "allow-scripts allow-forms",
    );
    handle.dispose();
  });

  it("uses srcdoc (not src) so no network navigation is required", () => {
    const handle = mountSandboxed({ source: "console.log('hi')", container });
    expect(handle.iframe.getAttribute("src")).toBeNull();
    expect(handle.iframe.getAttribute("srcdoc")).toBeTruthy();
    handle.dispose();
  });
});

describe("mountSandboxed() — srcdoc content", () => {
  it("injects a CSP meta tag in the srcdoc", () => {
    const handle = mountSandboxed({ source: "", container });
    const srcdoc = handle.iframe.getAttribute("srcdoc")!;
    expect(srcdoc).toContain('http-equiv="Content-Security-Policy"');
    handle.dispose();
  });

  it("injects an importmap when provided", () => {
    const handle = mountSandboxed({
      source: "",
      container,
      importMap: { "@whisq/core": "https://esm.sh/@whisq/core@latest" },
    });
    const srcdoc = handle.iframe.getAttribute("srcdoc")!;
    expect(srcdoc).toContain('type="importmap"');
    expect(srcdoc).toContain("@whisq/core");
    expect(srcdoc).toContain("https://esm.sh/@whisq/core@latest");
    handle.dispose();
  });

  it("omits the importmap when none is provided", () => {
    const handle = mountSandboxed({ source: "", container });
    const srcdoc = handle.iframe.getAttribute("srcdoc")!;
    expect(srcdoc).not.toContain('type="importmap"');
    handle.dispose();
  });

  it("embeds the user source inside a module script", () => {
    const handle = mountSandboxed({
      source: "const x = 42; window.__whisqPost(x);",
      container,
    });
    const srcdoc = handle.iframe.getAttribute("srcdoc")!;
    expect(srcdoc).toContain('type="module"');
    expect(srcdoc).toContain("const x = 42");
    handle.dispose();
  });

  it("neutralises </script> inside the source to prevent srcdoc escape", () => {
    const handle = mountSandboxed({
      source: "// </script><img src=x onerror=alert(1)>",
      container,
    });
    const srcdoc = handle.iframe.getAttribute("srcdoc")!;
    // The injection pattern "</script><img" must NOT appear together —
    // that's the shape that would close the module block and inject HTML.
    expect(srcdoc).not.toContain("</script><img");
    // The escaped form should appear instead (backslash before the closer).
    expect(srcdoc).toContain("<\\/script>");
    // The caller's intent (the comment text minus the closer) is preserved
    expect(srcdoc).toContain("onerror=alert(1)");
    handle.dispose();
  });
});

describe("mountSandboxed() — postMessage bridge", () => {
  it("exposes postMessage on the handle", () => {
    const handle = mountSandboxed({ source: "", container });
    expect(typeof handle.postMessage).toBe("function");
    // Should not throw even if the iframe hasn't finished loading
    expect(() => handle.postMessage({ type: "ping" })).not.toThrow();
    handle.dispose();
  });

  it("invokes onMessage for __whisq-tagged messages from the iframe", () => {
    const onMessage = vi.fn();
    const handle = mountSandboxed({
      source: "",
      container,
      onMessage,
    });

    // Simulate the iframe posting a tagged message
    const event = new MessageEvent("message", {
      source: handle.iframe.contentWindow,
      data: { __whisq: true, payload: { type: "ready" } },
    });
    window.dispatchEvent(event);

    expect(onMessage).toHaveBeenCalledWith({ type: "ready" });
    handle.dispose();
  });

  it("ignores messages that aren't __whisq-tagged (cross-talk protection)", () => {
    const onMessage = vi.fn();
    const handle = mountSandboxed({ source: "", container, onMessage });

    const event = new MessageEvent("message", {
      source: handle.iframe.contentWindow,
      data: { type: "ready" }, // no __whisq flag
    });
    window.dispatchEvent(event);

    expect(onMessage).not.toHaveBeenCalled();
    handle.dispose();
  });

  it("ignores messages not from the sandbox iframe's window", () => {
    const onMessage = vi.fn();
    const handle = mountSandboxed({ source: "", container, onMessage });

    // Different source window
    const otherWindow = document.createElement("iframe");
    document.body.appendChild(otherWindow);

    const event = new MessageEvent("message", {
      source: otherWindow.contentWindow,
      data: { __whisq: true, payload: { type: "spoof" } },
    });
    window.dispatchEvent(event);

    expect(onMessage).not.toHaveBeenCalled();
    otherWindow.remove();
    handle.dispose();
  });
});

describe("mountSandboxed() — dispose", () => {
  it("removes the iframe from the DOM", () => {
    const handle = mountSandboxed({ source: "", container });
    expect(container.querySelector("iframe")).not.toBeNull();
    handle.dispose();
    expect(container.querySelector("iframe")).toBeNull();
  });

  it("unregisters the message handler", () => {
    const onMessage = vi.fn();
    const handle = mountSandboxed({ source: "", container, onMessage });

    handle.dispose();

    const event = new MessageEvent("message", {
      source: handle.iframe.contentWindow,
      data: { __whisq: true, payload: {} },
    });
    window.dispatchEvent(event);

    expect(onMessage).not.toHaveBeenCalled();
  });

  it("is idempotent (safe to call twice)", () => {
    const handle = mountSandboxed({ source: "", container });
    handle.dispose();
    expect(() => handle.dispose()).not.toThrow();
  });
});
