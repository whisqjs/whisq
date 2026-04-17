import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { signal } from "../reactive.js";
import { div, mount } from "../elements.js";
import { component, useHead } from "../component.js";

// ── Test helpers ────────────────────────────────────────────────────────────

let container: HTMLElement;
let dispose: () => void;

beforeEach(() => {
  container = document.createElement("div");
  document.body.appendChild(container);
  document.title = "";
});

afterEach(() => {
  if (dispose) dispose();
  container.remove();
  document.title = "";
  // Clean up any meta/link tags added during tests
  document.head
    .querySelectorAll("[data-whisq-head]")
    .forEach((el) => el.remove());
});

// ── useHead() ──────────────────────────────────────────────────────────────

describe("useHead()", () => {
  it("sets document.title from static string", () => {
    const App = component(() => {
      useHead({ title: "Hello Whisq" });
      return div("app");
    });
    dispose = mount(App({}), container);

    expect(document.title).toBe("Hello Whisq");
  });

  it("sets document.title reactively from function", () => {
    const page = signal("Home");
    const App = component(() => {
      useHead({ title: () => `${page.value} — Whisq` });
      return div("app");
    });
    dispose = mount(App({}), container);

    expect(document.title).toBe("Home — Whisq");
  });

  it("updates title when signal changes", () => {
    const page = signal("Home");
    const App = component(() => {
      useHead({ title: () => `${page.value} — Whisq` });
      return div("app");
    });
    dispose = mount(App({}), container);

    expect(document.title).toBe("Home — Whisq");

    page.value = "About";
    expect(document.title).toBe("About — Whisq");
  });

  it("adds meta tags to document.head", () => {
    const App = component(() => {
      useHead({
        meta: [
          { name: "description", content: "A reactive framework" },
          { property: "og:title", content: "Whisq" },
        ],
      });
      return div("app");
    });
    dispose = mount(App({}), container);

    const desc = document.head.querySelector(
      'meta[name="description"]',
    ) as HTMLMetaElement;
    expect(desc).not.toBeNull();
    expect(desc.content).toBe("A reactive framework");

    const og = document.head.querySelector(
      'meta[property="og:title"]',
    ) as HTMLMetaElement;
    expect(og).not.toBeNull();
    expect(og.content).toBe("Whisq");
  });

  it("removes meta tags on dispose", () => {
    const App = component(() => {
      useHead({
        meta: [{ name: "description", content: "test" }],
      });
      return div("app");
    });
    dispose = mount(App({}), container);

    expect(
      document.head.querySelector('meta[name="description"]'),
    ).not.toBeNull();

    dispose();

    expect(
      document.head.querySelector('meta[name="description"][data-whisq-head]'),
    ).toBeNull();
  });

  it("supports reactive meta content", () => {
    const desc = signal("Initial description");
    const App = component(() => {
      useHead({
        meta: [{ name: "description", content: () => desc.value }],
      });
      return div("app");
    });
    dispose = mount(App({}), container);

    const el = document.head.querySelector(
      'meta[name="description"]',
    ) as HTMLMetaElement;
    expect(el.content).toBe("Initial description");

    desc.value = "Updated description";
    expect(el.content).toBe("Updated description");
  });

  it("adds link tags to document.head", () => {
    const App = component(() => {
      useHead({
        link: [
          { rel: "stylesheet", href: "/style.css" },
          { rel: "icon", href: "/favicon.ico" },
        ],
      });
      return div("app");
    });
    dispose = mount(App({}), container);

    const stylesheet = document.head.querySelector(
      'link[rel="stylesheet"]',
    ) as HTMLLinkElement;
    expect(stylesheet).not.toBeNull();
    expect(stylesheet.href).toContain("/style.css");

    const icon = document.head.querySelector(
      'link[rel="icon"]',
    ) as HTMLLinkElement;
    expect(icon).not.toBeNull();
  });

  it("removes link tags on dispose", () => {
    const App = component(() => {
      useHead({
        link: [{ rel: "stylesheet", href: "/style.css" }],
      });
      return div("app");
    });
    dispose = mount(App({}), container);

    expect(
      document.head.querySelector('link[rel="stylesheet"][data-whisq-head]'),
    ).not.toBeNull();

    dispose();

    expect(
      document.head.querySelector('link[rel="stylesheet"][data-whisq-head]'),
    ).toBeNull();
  });

  it("throws outside component setup", () => {
    expect(() => useHead({ title: "test" })).toThrow(
      "must be called inside a component()",
    );
  });
});
