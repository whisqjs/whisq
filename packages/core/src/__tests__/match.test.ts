import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { signal } from "../reactive.js";
import { div, p, span, match, mount } from "../elements.js";
import { WhisqStructureError } from "../dev-errors.js";

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

describe("match()", () => {
  it("renders the first branch whose predicate is true", () => {
    const node = div(
      match([() => true, () => p("first")], [() => true, () => p("second")]),
    );
    dispose = mount(node, container);

    expect(container.querySelectorAll("p")).toHaveLength(1);
    expect(container.querySelector("p")!.textContent).toBe("first");
  });

  it("renders a later branch when earlier predicates are false", () => {
    const node = div(
      match(
        [() => false, () => p("skipped")],
        [() => false, () => p("also skipped")],
        [() => true, () => p("winner")],
      ),
    );
    dispose = mount(node, container);

    expect(container.querySelector("p")!.textContent).toBe("winner");
  });

  it("renders the fallback when no branch matches", () => {
    const node = div(
      match([() => false, () => p("a")], [() => false, () => p("b")], () =>
        p("fallback"),
      ),
    );
    dispose = mount(node, container);

    expect(container.querySelector("p")!.textContent).toBe("fallback");
  });

  it("renders nothing when no branch matches and no fallback is given", () => {
    const node = div(
      match([() => false, () => p("a")], [() => false, () => p("b")]),
    );
    dispose = mount(node, container);

    expect(container.querySelector("p")).toBeNull();
  });

  it("is reactive — predicate changes swap the rendered branch", () => {
    const status = signal<"loading" | "error" | "ready">("loading");
    const node = div(
      match(
        [() => status.value === "loading", () => p("Loading...")],
        [() => status.value === "error", () => p({ class: "error" }, "Oops")],
        [() => status.value === "ready", () => p("Done")],
      ),
    );
    dispose = mount(node, container);

    expect(container.querySelector("p")!.textContent).toBe("Loading...");

    status.value = "error";
    expect(container.querySelector("p")!.textContent).toBe("Oops");
    expect(container.querySelector("p")!.className).toBe("error");

    status.value = "ready";
    expect(container.querySelector("p")!.textContent).toBe("Done");
  });

  it("renders the fallback when all predicates turn false reactively", () => {
    const active = signal(true);
    const node = div(
      match([() => active.value, () => p("on")], () => p("off")),
    );
    dispose = mount(node, container);

    expect(container.querySelector("p")!.textContent).toBe("on");
    active.value = false;
    expect(container.querySelector("p")!.textContent).toBe("off");
  });

  it("supports complex children (nested hyperscript)", () => {
    const node = div(
      match([
        () => true,
        () => div({ class: "card" }, p("title"), span("subtitle")),
      ]),
    );
    dispose = mount(node, container);

    const card = container.querySelector(".card");
    expect(card).not.toBeNull();
    expect(card!.querySelector("p")!.textContent).toBe("title");
    expect(card!.querySelector("span")!.textContent).toBe("subtitle");
  });

  it("returns null when called with no arguments", () => {
    const node = div(match());
    dispose = mount(node, container);
    expect(container.querySelector("p")).toBeNull();
  });

  it("renders the fallback when branches is empty but fallback is provided", () => {
    const node = div(match(() => p("only the fallback")));
    dispose = mount(node, container);
    expect(container.querySelector("p")!.textContent).toBe("only the fallback");
  });
});

// ── dev-mode validation (WHISQ-83) ─────────────────────────────────────────

describe("match() — dev-mode input validation", () => {
  it("throws WhisqStructureError for the object-dispatch shape GPT expected", () => {
    expect(() => {
      match(
        // User reaching for pattern-matching on a value with an object map.
        // `match` is a predicate chain — object dispatch isn't supported.
        { loading: () => p("Loading") } as never,
      );
    }).toThrow(WhisqStructureError);

    try {
      match({ loading: () => p("Loading") } as never);
    } catch (err) {
      expect((err as Error).message).toMatch(/predicate chain/);
      expect((err as WhisqStructureError).element).toBe("match");
    }
  });

  it("throws when a branch tuple has the wrong arity or non-function members", () => {
    expect(() => {
      match([() => true, () => p("ok"), "extra"] as never);
    }).toThrow(/branch tuple/);

    expect(() => {
      match([true, () => p("ok")] as never);
    }).toThrow(/branch tuple/);
  });

  it("throws when the fallback is not in the last position", () => {
    expect(() => {
      match(
        [() => true, () => p("a")],
        () => p("fallback out of place"),
        [() => false, () => p("b")],
      );
    }).toThrow(/fallback render.*last/);
  });

  it("does NOT throw for the canonical shape (regression guard)", () => {
    expect(() => {
      match(
        [() => true, () => p("a")],
        [() => false, () => p("b")],
        () => p("fallback"),
      );
    }).not.toThrow();

    expect(() => {
      match([() => true, () => p("only")]);
    }).not.toThrow();

    expect(() => {
      match();
    }).not.toThrow();
  });
});
