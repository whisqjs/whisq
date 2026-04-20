// Type-level assertions for element event handler inference.
// Included in tsc's typecheck via packages/core/tsconfig.json's
// `src/**/*.ts` glob. Runtime work is a no-op — the file exercises the type
// checker, not the DOM.

import { describe, it, expectTypeOf } from "vitest";
import {
  input,
  textarea,
  select,
  option,
  form,
  button,
  a,
  img,
  div,
} from "../elements.js";
import type { EventHandler, WhisqEvent } from "../elements.js";

describe("event handler type inference", () => {
  it("input oninput narrows currentTarget to HTMLInputElement", () => {
    input({
      oninput: (e) => {
        // The motivating use case — no cast required on currentTarget.value
        expectTypeOf(e.currentTarget.value).toEqualTypeOf<string>();
        expectTypeOf(e.currentTarget.checked).toEqualTypeOf<boolean>();
        expectTypeOf(e).toMatchTypeOf<InputEvent>();
      },
    });
  });

  it("input onchange / onfocus / onblur / onkeydown narrow to HTMLInputElement", () => {
    input({
      onchange: (e) => {
        expectTypeOf(e.currentTarget.type).toEqualTypeOf<string>();
      },
      onfocus: (e) => {
        expectTypeOf(e).toMatchTypeOf<FocusEvent>();
        expectTypeOf(e.currentTarget.select).toBeFunction();
      },
      onblur: (e) => {
        expectTypeOf(e).toMatchTypeOf<FocusEvent>();
      },
      onkeydown: (e) => {
        expectTypeOf(e).toMatchTypeOf<KeyboardEvent>();
        expectTypeOf(e.key).toEqualTypeOf<string>();
        expectTypeOf(e.currentTarget.value).toEqualTypeOf<string>();
      },
    });
  });

  it("textarea narrows currentTarget to HTMLTextAreaElement", () => {
    textarea({
      oninput: (e) => {
        expectTypeOf(e.currentTarget.rows).toEqualTypeOf<number>();
        expectTypeOf(e.currentTarget.cols).toEqualTypeOf<number>();
        expectTypeOf(e.currentTarget.value).toEqualTypeOf<string>();
      },
    });
  });

  it("select narrows currentTarget to HTMLSelectElement", () => {
    select({
      onchange: (e) => {
        expectTypeOf(e.currentTarget.selectedIndex).toEqualTypeOf<number>();
        expectTypeOf(e.currentTarget.options).toMatchTypeOf<HTMLCollection>();
      },
    });
  });

  it("form narrows onsubmit currentTarget to HTMLFormElement", () => {
    form({
      onsubmit: (e) => {
        expectTypeOf(e).toMatchTypeOf<SubmitEvent>();
        expectTypeOf(e.currentTarget.reset).toBeFunction();
        expectTypeOf(e.currentTarget.submit).toBeFunction();
      },
    });
  });

  it("anchor narrows onclick currentTarget to HTMLAnchorElement", () => {
    a({
      onclick: (e) => {
        expectTypeOf(e).toMatchTypeOf<MouseEvent>();
        expectTypeOf(e.currentTarget.href).toEqualTypeOf<string>();
        expectTypeOf(e.currentTarget.target).toEqualTypeOf<string>();
      },
    });
  });

  it("img narrows onclick currentTarget to HTMLImageElement", () => {
    img({
      onclick: (e) => {
        expectTypeOf(e.currentTarget.naturalWidth).toEqualTypeOf<number>();
        expectTypeOf(e.currentTarget.naturalHeight).toEqualTypeOf<number>();
      },
    });
  });

  it("option accepts its base props", () => {
    // Option has no narrowed event handlers; ensure the prop shape compiles.
    option({ value: "admin", selected: true });
  });

  it("generic elements (div, button) keep a usable HTMLElement on currentTarget", () => {
    div({
      onclick: (e) => {
        // HTMLElement members accessible without cast:
        expectTypeOf(e.currentTarget.click).toBeFunction();
        expectTypeOf(e.currentTarget.classList).toMatchTypeOf<DOMTokenList>();
      },
    });
    button({
      onclick: (e) => {
        expectTypeOf(e.currentTarget.focus).toBeFunction();
      },
    });
  });

  it("event type itself is still narrowed per prop name", () => {
    button({
      onclick: (e) => {
        expectTypeOf(e).toMatchTypeOf<MouseEvent>();
      },
      onkeydown: (e) => {
        expectTypeOf(e).toMatchTypeOf<KeyboardEvent>();
      },
    });
  });
});

describe("WhisqEvent<K, T> — named event-type alias", () => {
  it("resolves to the correct HTMLElementEventMap entry with narrowed currentTarget", () => {
    type Click = WhisqEvent<"click", HTMLButtonElement>;
    expectTypeOf<Click>().toMatchTypeOf<MouseEvent>();
    // Exercise the narrow via a member access — button-specific property
    // proves currentTarget resolved correctly without the deep-equals blow-up.
    expectTypeOf<Click["currentTarget"]["disabled"]>().toEqualTypeOf<boolean>();

    type Keydown = WhisqEvent<"keydown", HTMLInputElement>;
    expectTypeOf<Keydown>().toMatchTypeOf<KeyboardEvent>();
    expectTypeOf<Keydown["key"]>().toEqualTypeOf<string>();
    expectTypeOf<Keydown["currentTarget"]["value"]>().toEqualTypeOf<string>();

    type Input = WhisqEvent<"input", HTMLTextAreaElement>;
    expectTypeOf<Input>().toMatchTypeOf<Event>();
    expectTypeOf<Input["currentTarget"]["rows"]>().toEqualTypeOf<number>();
  });

  it("lets a named extracted handler slot into an element prop", () => {
    function onSearchKey(e: WhisqEvent<"keydown", HTMLInputElement>) {
      expectTypeOf(e.key).toEqualTypeOf<string>();
      expectTypeOf(e.currentTarget.value).toEqualTypeOf<string>();
    }
    input({ onkeydown: onSearchKey });
  });

  it("defaults T to Element when omitted", () => {
    type GenericClick = WhisqEvent<"click">;
    expectTypeOf<GenericClick>().toMatchTypeOf<MouseEvent>();
    // Element is a broad type; check a member it actually has.
    expectTypeOf<
      GenericClick["currentTarget"]["tagName"]
    >().toEqualTypeOf<string>();
  });
});

describe("EventHandler<E, T> — named handler-type alias", () => {
  it("accepts event + element type params and narrows currentTarget", () => {
    const onSubmit: EventHandler<SubmitEvent, HTMLFormElement> = (e) => {
      expectTypeOf(e).toMatchTypeOf<SubmitEvent>();
      expectTypeOf(e.currentTarget.reset).toBeFunction();
    };
    form({ onsubmit: onSubmit });
  });

  it("defaults E to Event and T to Element when both omitted", () => {
    const onAnything: EventHandler = (e) => {
      expectTypeOf(e).toMatchTypeOf<Event>();
      expectTypeOf(e.currentTarget.tagName).toEqualTypeOf<string>();
    };
    // Force retention so the local isn't tree-shaken from analysis.
    void onAnything;
  });

  it("composes with WhisqEvent — EventHandler can be typed via WhisqEvent", () => {
    // The two aliases are complementary: EventHandler takes `E` directly,
    // WhisqEvent<K, T> produces the `E & { currentTarget: T }` shape you'd
    // otherwise spell out by hand.
    const onDrag: EventHandler<WhisqEvent<"dragstart", HTMLDivElement>> = (
      e,
    ) => {
      expectTypeOf(e).toMatchTypeOf<DragEvent>();
      expectTypeOf(e.currentTarget.draggable).toEqualTypeOf<boolean>();
    };
    void onDrag;
  });
});
