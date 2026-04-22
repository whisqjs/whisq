// Type-level assertions for the component() signature.
// Covers WHISQ-108: `component()` must accept a setup function that
// returns `WhisqNode` (the actual hyperscript return type), and its call
// result must satisfy `Child` so components compose inside elements.

import { describe, it, expectTypeOf } from "vitest";
import { div, span, h1, p } from "../elements.js";
import { component } from "../component.js";
// `component` is re-exported via the public index; the re-export path
// must have the same signature as the internal one.
import { component as componentPublic } from "../index.js";
import type { WhisqNode } from "../elements.js";

describe("component() signature accepts hyperscript return types", () => {
  it("setup returning div() type-checks", () => {
    const Comp = component(() => div("hello"));
    // Calling the component gives back a WhisqNode — compatible with being
    // used as a child to other elements.
    expectTypeOf(Comp({})).toMatchTypeOf<WhisqNode>();
  });

  it("setup returning a nested element tree type-checks", () => {
    const Card = component((props: { title: string }) =>
      div({ class: "card" }, h1(props.title), p("body")),
    );
    expectTypeOf(Card({ title: "hi" })).toMatchTypeOf<WhisqNode>();
  });

  it("component's return value is a valid child of another element", () => {
    const Inner = component(() => span("inner"));
    // If this type-checks, we have the compose story closed: components
    // nest inside elements the same way elements do.
    const tree = div(Inner({}));
    expectTypeOf(tree).toMatchTypeOf<WhisqNode>();
  });

  it("public re-export has the same shape", () => {
    const Comp = componentPublic(() => div("public"));
    expectTypeOf(Comp({})).toMatchTypeOf<WhisqNode>();
  });
});
