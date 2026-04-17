import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { signal } from "../reactive.js";
import { div, span, mount } from "../elements.js";
import { component, createContext, provide, inject } from "../component.js";

// ── Test helpers ────────────────────────────────────────────────────────────

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

// ── createContext / provide / inject ────────────────────────────────────────

describe("context (provide/inject)", () => {
  it("inject returns default when no provider exists", () => {
    const ThemeCtx = createContext("light");
    let injected: string | undefined;

    const App = component(() => {
      injected = inject(ThemeCtx);
      return div("app");
    });

    dispose = mount(App({}), container);
    expect(injected).toBe("light");
  });

  it("inject returns undefined when no provider and no default", () => {
    const Ctx = createContext<string>();
    let injected: string | undefined;

    const App = component(() => {
      injected = inject(Ctx);
      return div("app");
    });

    dispose = mount(App({}), container);
    expect(injected).toBeUndefined();
  });

  it("provide + inject in parent/child", () => {
    const ThemeCtx = createContext("light");
    let injected: string | undefined;

    const Child = component(() => {
      injected = inject(ThemeCtx);
      return span("child");
    });

    const Parent = component(() => {
      provide(ThemeCtx, "dark");
      return div(Child({}));
    });

    dispose = mount(Parent({}), container);
    expect(injected).toBe("dark");
  });

  it("provide + inject across multiple nesting levels", () => {
    const Ctx = createContext(0);
    let injected: number | undefined;

    const GrandChild = component(() => {
      injected = inject(Ctx);
      return span("gc");
    });

    const Child = component(() => {
      return div(GrandChild({}));
    });

    const Parent = component(() => {
      provide(Ctx, 42);
      return div(Child({}));
    });

    dispose = mount(Parent({}), container);
    expect(injected).toBe(42);
  });

  it("multiple contexts independently", () => {
    const ThemeCtx = createContext("light");
    const LangCtx = createContext("en");
    let theme: string | undefined;
    let lang: string | undefined;

    const Child = component(() => {
      theme = inject(ThemeCtx);
      lang = inject(LangCtx);
      return span("child");
    });

    const Parent = component(() => {
      provide(ThemeCtx, "dark");
      provide(LangCtx, "cs");
      return div(Child({}));
    });

    dispose = mount(Parent({}), container);
    expect(theme).toBe("dark");
    expect(lang).toBe("cs");
  });

  it("closer provider overrides parent provider", () => {
    const Ctx = createContext("root");
    let injected: string | undefined;

    const GrandChild = component(() => {
      injected = inject(Ctx);
      return span("gc");
    });

    const Child = component(() => {
      provide(Ctx, "child-override");
      return div(GrandChild({}));
    });

    const Parent = component(() => {
      provide(Ctx, "parent");
      return div(Child({}));
    });

    dispose = mount(Parent({}), container);
    expect(injected).toBe("child-override");
  });

  it("sibling components get independent context", () => {
    const Ctx = createContext("default");
    let injectedA: string | undefined;
    let injectedB: string | undefined;

    const ChildA = component(() => {
      provide(Ctx, "A-override");
      injectedA = inject(Ctx);
      return span("a");
    });

    const ChildB = component(() => {
      injectedB = inject(Ctx);
      return span("b");
    });

    const Parent = component(() => {
      provide(Ctx, "parent");
      return div(ChildA({}), ChildB({}));
    });

    dispose = mount(Parent({}), container);
    expect(injectedA).toBe("A-override");
    expect(injectedB).toBe("parent"); // not affected by ChildA's provide
  });

  it("reactive context via signal values", () => {
    const ThemeCtx = createContext(signal("light"));
    let themeSignal: ReturnType<typeof signal<string>> | undefined;

    const Child = component(() => {
      themeSignal = inject(ThemeCtx);
      return span(() => themeSignal!.value);
    });

    const Parent = component(() => {
      const theme = signal("dark");
      provide(ThemeCtx, theme);
      return div(Child({}));
    });

    dispose = mount(Parent({}), container);
    expect(themeSignal!.value).toBe("dark");
    expect(container.querySelector("span")!.textContent).toBe("dark");

    themeSignal!.value = "ocean";
    expect(container.querySelector("span")!.textContent).toBe("ocean");
  });

  it("disposed component context does not bleed into fresh mount", () => {
    const Ctx = createContext("default");
    let first: string | undefined;
    let second: string | undefined;

    const Child = component(() => {
      first = inject(Ctx);
      return span("c");
    });
    const Provider = component(() => {
      provide(Ctx, "provided");
      return div(Child({}));
    });

    const d = mount(Provider({}), container);
    expect(first).toBe("provided");
    d(); // dispose

    const Bare = component(() => {
      second = inject(Ctx);
      return span("bare");
    });
    dispose = mount(Bare({}), container);

    expect(second).toBe("default");
  });

  it("provide throws outside component setup", () => {
    const Ctx = createContext("x");
    expect(() => provide(Ctx, "y")).toThrow(
      "must be called inside a component()",
    );
  });

  it("inject throws outside component setup", () => {
    const Ctx = createContext("x");
    expect(() => inject(Ctx)).toThrow("must be called inside a component()");
  });
});
