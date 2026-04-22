// Type-level assertions for sheet() style object nesting.
// Covers WHISQ-108: sheet definitions must accept both plain CSS
// properties and nested rules under "&" / "@" selectors at the same key
// level without type errors.

import { describe, it, expectTypeOf } from "vitest";
import { sheet } from "../styling.js";

describe("sheet() accepts nested selectors", () => {
  it("flat rules type-check", () => {
    const s = sheet({
      card: { color: "red", padding: "1rem" },
    });
    expectTypeOf(s.card).toEqualTypeOf<string>();
  });

  it("pseudo-class nested rules type-check", () => {
    const s = sheet({
      link: {
        color: "var(--color-accent)",
        textDecoration: "none",
        "&:hover": { textDecoration: "underline" },
      },
    });
    expectTypeOf(s.link).toEqualTypeOf<string>();
  });

  it("pseudo-element nested rules type-check", () => {
    const s = sheet({
      quote: {
        fontStyle: "italic",
        "&::before": { content: '"“"' },
        "&::after": { content: '"”"' },
      },
    });
    expectTypeOf(s.quote).toEqualTypeOf<string>();
  });

  it("descendant / child selectors type-check", () => {
    const s = sheet({
      nav: {
        display: "flex",
        "& a": { color: "blue" },
        "& > span": { color: "red" },
      },
    });
    expectTypeOf(s.nav).toEqualTypeOf<string>();
  });

  it("media queries type-check", () => {
    const s = sheet({
      row: {
        display: "flex",
        gap: "1rem",
        "@media (max-width: 640px)": {
          flexDirection: "column",
          gap: "0.5rem",
        },
      },
    });
    expectTypeOf(s.row).toEqualTypeOf<string>();
  });

  it("mixed flat + pseudo + media in one rule type-checks", () => {
    const s = sheet({
      btn: {
        padding: "0.5rem 1rem",
        color: "white",
        background: "var(--color-primary)",
        "&:hover": { background: "var(--color-primary-hover)" },
        "&:focus-visible": { outline: "2px solid white" },
        "@media (prefers-reduced-motion: reduce)": {
          transition: "none",
        },
      },
    });
    expectTypeOf(s.btn).toEqualTypeOf<string>();
  });
});
