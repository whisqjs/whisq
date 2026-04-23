import { describe, it, expect, beforeEach, vi } from "vitest";
import { sheet, styles, cx, rcx, theme } from "../styling";
import { signal } from "../reactive";

// Clean up injected styles between tests
beforeEach(() => {
  document.head
    .querySelectorAll("style[id^='whisq-style-']")
    .forEach((el) => el.remove());
});

// ── sheet() ─────────────────────────────────────────────────────────────────

describe("sheet()", () => {
  it("returns scoped class names for each key", () => {
    const s = sheet({
      card: { padding: "1rem" },
      title: { fontSize: "1.5rem" },
    });

    expect(s.card).toMatch(/^wq\d+_card$/);
    expect(s.title).toMatch(/^wq\d+_title$/);
    expect(s.card).not.toBe(s.title);
  });

  it("injects a <style> tag into document.head", () => {
    sheet({ btn: { color: "red" } });

    const styleTags = document.head.querySelectorAll(
      "style[id^='whisq-style-']",
    );
    expect(styleTags.length).toBeGreaterThan(0);
  });

  it("generates correct CSS from style objects", () => {
    sheet({ btn: { padding: "1rem", borderRadius: "8px" } });

    const styleEl = document.head.querySelector("style[id^='whisq-style-']");
    expect(styleEl?.textContent).toContain("padding:1rem");
    expect(styleEl?.textContent).toContain("border-radius:8px");
  });

  it("handles nested pseudo-class rules (&:hover)", () => {
    sheet({
      btn: {
        color: "blue",
        "&:hover": { color: "red" },
      },
    });

    const css =
      document.head.querySelector("style[id^='whisq-style-']")?.textContent ??
      "";
    expect(css).toContain(":hover{color:red;}");
  });

  it("handles nested media query rules (@media)", () => {
    sheet({
      container: {
        width: "100%",
        "@media (min-width: 768px)": { width: "768px" },
      },
    });

    const css =
      document.head.querySelector("style[id^='whisq-style-']")?.textContent ??
      "";
    expect(css).toContain("@media (min-width: 768px)");
    expect(css).toContain("width:768px");
  });

  it("cls() composes class names conditionally", () => {
    const s = sheet({
      btn: { padding: "1rem" },
      primary: { background: "blue" },
      disabled: { opacity: "0.5" },
    });

    const result = s.cls("btn", "primary", false && "disabled");
    expect(result).toContain(s.btn);
    expect(result).toContain(s.primary);
    expect(result).not.toContain(s.disabled);
  });

  it("cls() ignores null and undefined", () => {
    const s = sheet({
      a: { color: "red" },
      b: { color: "blue" },
    });

    const result = s.cls("a", null, undefined);
    expect(result).toBe(s.a);
  });

  it("generates unique class names across multiple calls", () => {
    const s1 = sheet({ card: { color: "red" } });
    const s2 = sheet({ card: { color: "blue" } });

    expect(s1.card).not.toBe(s2.card);
  });
});

// ── styles() ────────────────────────────────────────────────────────────────

describe("styles()", () => {
  it("returns a static string for non-reactive values", () => {
    const result = styles({ padding: "1rem", color: "red" });
    expect(typeof result).toBe("string");
    expect(result).toContain("padding:1rem");
    expect(result).toContain("color:red");
  });

  it("converts camelCase to kebab-case", () => {
    const result = styles({ backgroundColor: "#fff", borderRadius: "8px" });
    expect(result).toContain("background-color:#fff");
    expect(result).toContain("border-radius:8px");
  });

  it("returns a function when reactive values are present", () => {
    const color = signal("red");
    const result = styles({
      padding: "1rem",
      color: () => color.value,
    });

    expect(typeof result).toBe("function");
  });

  it("reactive function resolves to correct CSS", () => {
    const color = signal("red");
    const result = styles({
      padding: "1rem",
      color: () => color.value,
    }) as () => string;

    expect(result()).toContain("padding:1rem");
    expect(result()).toContain("color:red");

    color.value = "blue";
    expect(result()).toContain("color:blue");
  });

  it("omits undefined reactive values", () => {
    const result = styles({
      color: () => undefined,
      padding: "1rem",
    }) as () => string;

    const css = result();
    expect(css).toContain("padding:1rem");
    expect(css).not.toContain("color");
  });

  it("handles numeric values", () => {
    const result = styles({ opacity: 0.5, zIndex: 10 });
    expect(result).toContain("opacity:0.5");
    expect(result).toContain("z-index:10");
  });
});

// ── cx() ────────────────────────────────────────────────────────────────────

describe("cx()", () => {
  it("joins string class names", () => {
    expect(cx("a", "b", "c")).toBe("a b c");
  });

  it("filters out falsy values", () => {
    expect(cx("a", false, null, undefined, 0, "b")).toBe("a b");
  });

  it("handles object syntax with boolean values", () => {
    expect(cx({ active: true, disabled: false, highlight: true })).toBe(
      "active highlight",
    );
  });

  it("handles object syntax with function values", () => {
    expect(cx({ active: () => true, disabled: () => false })).toBe("active");
  });

  it("mixes strings and objects", () => {
    expect(cx("btn", { primary: true, large: false }, "extra")).toBe(
      "btn primary extra",
    );
  });

  it("returns empty string for all falsy", () => {
    expect(cx(false, null, undefined, 0)).toBe("");
  });
});

// ── rcx() ───────────────────────────────────────────────────────────────────

describe("rcx()", () => {
  it("returns a function", () => {
    const result = rcx("btn");
    expect(typeof result).toBe("function");
  });

  it("composes static and reactive class names", () => {
    const active = signal(true);
    const result = rcx("btn", () => active.value && "btn-active");

    expect(result()).toBe("btn btn-active");

    active.value = false;
    expect(result()).toBe("btn");
  });

  it("filters out falsy static values", () => {
    const result = rcx("a", false, null, undefined, "b");
    expect(result()).toBe("a b");
  });

  it("filters out falsy reactive values", () => {
    const result = rcx(
      "base",
      () => false,
      () => null,
      () => "extra",
    );
    expect(result()).toBe("base extra");
  });
});

// ── theme() ─────────────────────────────────────────────────────────────────

describe("theme()", () => {
  it("injects CSS custom properties at :root", () => {
    theme({
      color: {
        primary: "#4386FB",
        text: "#111",
      },
    });

    const styleEl = document.getElementById("whisq-style-whisq-theme");
    expect(styleEl).not.toBeNull();
    expect(styleEl?.textContent).toContain("--color-primary:#4386FB");
    expect(styleEl?.textContent).toContain("--color-text:#111");
  });

  it("handles flat tokens", () => {
    theme({ fontSize: "16px", lineHeight: 1.5 });

    const css =
      document.getElementById("whisq-style-whisq-theme")?.textContent ?? "";
    expect(css).toContain("--fontSize:16px");
    expect(css).toContain("--lineHeight:1.5");
  });

  it("handles nested token groups", () => {
    theme({
      space: { xs: "0.25rem", sm: "0.5rem", md: "1rem" },
      radius: { sm: "4px", lg: "12px" },
    });

    const css =
      document.getElementById("whisq-style-whisq-theme")?.textContent ?? "";
    expect(css).toContain("--space-xs:0.25rem");
    expect(css).toContain("--space-md:1rem");
    expect(css).toContain("--radius-lg:12px");
  });

  it("replaces existing theme on second call", () => {
    // Second call triggers the dup-warning (WHISQ-122) by default; use
    // silent:true here since we're testing replacement semantics, not the
    // warning itself.
    theme({ color: { primary: "red" } });
    theme({ color: { primary: "blue" } }, { silent: true });

    const styleTags = document.querySelectorAll("#whisq-style-whisq-theme");
    expect(styleTags.length).toBe(1);
    expect(styleTags[0].textContent).toContain("--color-primary:blue");
    expect(styleTags[0].textContent).not.toContain("--color-primary:red");
  });
});

// ── Duplicate-call warning (WHISQ-122) ──────────────────────────────────────
//
// Dev-mode warning on second+ theme() calls catches the accidental-
// overwrite failure mode Claude flagged in alpha.8 feedback (import one
// styles.ts file, later import another that also calls theme(), last call
// silently wipes the first). Detection is DOM-based (existing whisq-
// style-whisq-theme element), so the beforeEach that clears that element
// naturally resets state between tests — no counter to maintain.

describe("theme() — duplicate-call warning", () => {
  let warn: ReturnType<typeof vi.spyOn>;
  beforeEach(() => {
    warn = vi.spyOn(console, "warn").mockImplementation(() => {});
  });

  it("does NOT warn on first theme() call", () => {
    theme({ color: { primary: "red" } });
    expect(warn).not.toHaveBeenCalled();
  });

  it("warns on second theme() call in dev (default)", () => {
    theme({ color: { primary: "red" } });
    theme({ color: { primary: "blue" } });
    expect(warn).toHaveBeenCalledTimes(1);
    const msg = warn.mock.calls[0]![0] as string;
    expect(msg).toContain("theme()");
    expect(msg).toMatch(/replaces?|last-call-wins|duplicate/i);
  });

  it("warns again on third call (persistent, not just once)", () => {
    theme({ color: { primary: "a" } });
    theme({ color: { primary: "b" } });
    theme({ color: { primary: "c" } });
    expect(warn).toHaveBeenCalledTimes(2);
  });

  it("suppresses the warning when silent: true is passed", () => {
    theme({ color: { primary: "red" } });
    theme({ color: { primary: "blue" } }, { silent: true });
    expect(warn).not.toHaveBeenCalled();
  });

  it("warns in dev even if the first call used silent: true", () => {
    // silent applies only to THIS call. A subsequent call still warns
    // against whatever style tag exists — silent doesn't disable detection
    // globally.
    theme({ color: { primary: "red" } }, { silent: true });
    theme({ color: { primary: "blue" } });
    expect(warn).toHaveBeenCalledTimes(1);
  });

  it("does NOT warn in production", () => {
    const originalEnv = process.env.NODE_ENV;
    process.env.NODE_ENV = "production";
    try {
      theme({ color: { primary: "red" } });
      theme({ color: { primary: "blue" } });
      expect(warn).not.toHaveBeenCalled();
    } finally {
      process.env.NODE_ENV = originalEnv;
    }
  });

  it("does NOT warn in SSR (no document)", () => {
    const originalDocument = globalThis.document;
    // @ts-expect-error intentional delete to simulate SSR
    delete (globalThis as { document?: Document }).document;
    try {
      theme({ color: { primary: "red" } });
      theme({ color: { primary: "blue" } });
      expect(warn).not.toHaveBeenCalled();
    } finally {
      (globalThis as { document?: Document }).document = originalDocument;
    }
  });
});

// ── SSR safety ──────────────────────────────────────────────────────────────

describe("styling SSR safety", () => {
  // Simulate a server environment where `document` is undefined (the usual
  // Node SSR shape). We do it via Object.defineProperty because jsdom exposes
  // `document` as a non-configurable global in some setups.
  function withoutDocument<T>(fn: () => T): T {
    const originalDocument = globalThis.document;
    // @ts-expect-error intentional delete for SSR simulation
    delete (globalThis as { document?: Document }).document;
    try {
      return fn();
    } finally {
      (globalThis as { document?: Document }).document = originalDocument;
    }
  }

  it("theme() no-ops when document is undefined (server)", () => {
    expect(() =>
      withoutDocument(() => {
        theme({ color: { primary: "red" }, space: { md: "1rem" } });
      }),
    ).not.toThrow();
  });

  it("sheet() returns the classMap when document is undefined (server)", () => {
    const result = withoutDocument(() =>
      sheet({
        card: { padding: "1rem" },
        title: { fontSize: "1.5rem" },
      }),
    );

    // Class names must be generated — they're referenced by server-rendered
    // markup that the client will then hydrate against.
    expect(typeof result.card).toBe("string");
    expect(typeof result.title).toBe("string");
    expect(result.card).not.toBe(result.title);
  });

  it("sheet() does not throw when document is undefined", () => {
    expect(() =>
      withoutDocument(() => {
        sheet({ btn: { color: "red", "&:hover": { color: "blue" } } });
      }),
    ).not.toThrow();
  });
});
