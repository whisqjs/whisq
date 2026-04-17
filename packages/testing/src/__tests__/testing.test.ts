import { describe, it, expect, afterEach } from "vitest";
import {
  signal,
  div,
  span,
  p,
  button,
  input,
  form,
  label,
  select,
  option,
  ul,
  li,
  component,
} from "@whisq/core";
import {
  render,
  screen,
  fireEvent,
  userEvent,
  waitFor,
  cleanup,
} from "../index.js";

afterEach(() => {
  cleanup();
});

// ── render ─────────────────────────────────────────────────────────────────

describe("render", () => {
  it("mounts component and returns container", () => {
    const { container } = render(div(p("Hello")));
    expect(container.textContent).toBe("Hello");
  });

  it("unmount cleans up", () => {
    const { container, unmount } = render(div("Content"));
    expect(container.textContent).toBe("Content");
    unmount();
    expect(container.textContent).toBe("");
  });
});

// ── screen.getByText / queryByText ────────────────────────────────────────

describe("screen.getByText", () => {
  it("finds element by text content", () => {
    render(div(p("Hello World")));
    const el = screen.getByText("Hello World");
    expect(el.tagName).toBe("P");
  });

  it("throws when element not found", () => {
    render(div(p("Exists")));
    expect(() => screen.getByText("Missing")).toThrow();
  });

  it("finds partial text match", () => {
    render(div(span("Hello World")));
    const el = screen.getByText("Hello", { exact: false });
    expect(el).toBeTruthy();
  });
});

describe("screen.queryByText", () => {
  it("returns null when not found", () => {
    render(div(p("Exists")));
    expect(screen.queryByText("Missing")).toBeNull();
  });

  it("returns element when found", () => {
    render(div(p("Found")));
    expect(screen.queryByText("Found")).not.toBeNull();
  });
});

// ── screen.getByRole / queryByRole ────────────────────────────────────────

describe("screen.getByRole", () => {
  it("finds button by role", () => {
    render(div(button("Click me")));
    const el = screen.getByRole("button");
    expect(el.textContent).toBe("Click me");
  });

  it("finds input by role", () => {
    render(div(input({ type: "text" })));
    const el = screen.getByRole("textbox");
    expect(el.tagName).toBe("INPUT");
  });

  it("throws when role not found", () => {
    render(div(p("No button here")));
    expect(() => screen.getByRole("button")).toThrow();
  });
});

describe("screen.queryByRole", () => {
  it("returns null when role not found", () => {
    render(div(p("Text")));
    expect(screen.queryByRole("button")).toBeNull();
  });
});

// ── screen.getByTestId / queryByTestId ────────────────────────────────────

describe("screen.getByTestId", () => {
  it("finds element by data-testid", () => {
    render(div({ "data-testid": "my-element" }, "Content"));
    const el = screen.getByTestId("my-element");
    expect(el.textContent).toBe("Content");
  });

  it("throws when testid not found", () => {
    render(div("No testid"));
    expect(() => screen.getByTestId("missing")).toThrow("data-testid");
  });
});

describe("screen.queryByTestId", () => {
  it("returns null when testid not found", () => {
    render(div("No testid"));
    expect(screen.queryByTestId("missing")).toBeNull();
  });
});

// ── screen.getByLabelText / queryByLabelText ──────────────────────────────

describe("screen.getByLabelText", () => {
  it("finds input by label with htmlFor", () => {
    render(
      div(
        label({ for: "email" }, "Email"),
        input({ id: "email", type: "email" }),
      ),
    );
    const el = screen.getByLabelText("Email");
    expect(el.tagName).toBe("INPUT");
  });

  it("finds nested input inside label", () => {
    render(div(label({}, "Name", input({ type: "text" }))));
    const el = screen.getByLabelText("Name");
    expect(el.tagName).toBe("INPUT");
  });

  it("finds element by aria-label", () => {
    render(div(button({ "aria-label": "Close dialog" }, "X")));
    const el = screen.getByLabelText("Close dialog");
    expect(el.textContent).toBe("X");
  });

  it("throws when label not found", () => {
    render(div(input({ type: "text" })));
    expect(() => screen.getByLabelText("Missing")).toThrow("label");
  });
});

// ── screen.getAllByText / queryAllByText ───────────────────────────────────

describe("screen.getAllByText", () => {
  it("returns all matching elements", () => {
    render(ul(li("Item"), li("Item"), li("Item")));
    const els = screen.getAllByText("Item");
    expect(els.length).toBe(3);
  });

  it("throws when none found", () => {
    render(div("Nothing"));
    expect(() => screen.getAllByText("Missing")).toThrow();
  });
});

describe("screen.queryAllByText", () => {
  it("returns empty array when none found", () => {
    render(div("Nothing"));
    expect(screen.queryAllByText("Missing")).toEqual([]);
  });
});

// ── screen.getAllByRole / queryAllByRole ───────────────────────────────────

describe("screen.getAllByRole", () => {
  it("returns all buttons", () => {
    render(div(button("A"), button("B"), button("C")));
    const els = screen.getAllByRole("button");
    expect(els.length).toBe(3);
  });

  it("throws when none found", () => {
    render(div(p("No buttons")));
    expect(() => screen.getAllByRole("button")).toThrow();
  });
});

describe("screen.queryAllByRole", () => {
  it("returns empty array when none found", () => {
    render(div(p("No buttons")));
    expect(screen.queryAllByRole("button")).toEqual([]);
  });
});

// ── fireEvent ─────────────────────────────────────────────────────────────

describe("fireEvent", () => {
  it("click triggers handler", () => {
    let clicked = false;
    render(
      button(
        {
          onclick: () => {
            clicked = true;
          },
        },
        "Click",
      ),
    );
    fireEvent.click(screen.getByText("Click"));
    expect(clicked).toBe(true);
  });

  it("input triggers oninput handler", () => {
    const value = signal("");
    render(
      input({
        type: "text",
        oninput: (e: InputEvent) => {
          value.value = (e.target as HTMLInputElement).value;
        },
      }),
    );
    const el = screen.getByRole("textbox") as HTMLInputElement;
    fireEvent.input(el, { target: { value: "hello" } });
    expect(value.value).toBe("hello");
  });

  it("submit triggers form handler", () => {
    let submitted = false;
    render(
      form(
        {
          onsubmit: (e: SubmitEvent) => {
            e.preventDefault();
            submitted = true;
          },
        },
        button({ type: "submit" }, "Submit"),
      ),
    );
    fireEvent.submit(screen.getByRole("button"));
    expect(submitted).toBe(true);
  });
});

// ── waitFor ───────────────────────────────────────────────────────────────

describe("waitFor", () => {
  it("resolves when callback succeeds", async () => {
    const result = await waitFor(() => 42);
    expect(result).toBe(42);
  });

  it("retries until callback succeeds", async () => {
    let count = 0;
    const result = await waitFor(
      () => {
        count++;
        if (count < 3) throw new Error("not yet");
        return "done";
      },
      { interval: 10 },
    );
    expect(result).toBe("done");
    expect(count).toBe(3);
  });

  it("throws after timeout", async () => {
    await expect(
      waitFor(
        () => {
          throw new Error("never");
        },
        { timeout: 100, interval: 10 },
      ),
    ).rejects.toThrow("never");
  });
});

// ── screen.findBy (async queries) ─────────────────────────────────────────

describe("screen.findByText", () => {
  it("finds element that appears asynchronously", async () => {
    const show = signal(false);
    render(div(() => (show.value ? p("Loaded!") : null)));

    setTimeout(() => {
      show.value = true;
    }, 50);

    const el = await screen.findByText("Loaded!", { timeout: 500 });
    expect(el.tagName).toBe("P");
  });

  it("rejects if element never appears", async () => {
    render(div("Static"));
    await expect(
      screen.findByText("Never", { timeout: 100, interval: 10 }),
    ).rejects.toThrow("Never");
  });
});

describe("screen.findByRole", () => {
  it("finds element that appears asynchronously", async () => {
    const show = signal(false);
    render(div(() => (show.value ? button("Action") : null)));

    setTimeout(() => {
      show.value = true;
    }, 50);

    const el = await screen.findByRole("button", { timeout: 500 });
    expect(el.textContent).toBe("Action");
  });
});

describe("screen.findByTestId", () => {
  it("finds element that appears asynchronously", async () => {
    const show = signal(false);
    render(
      div(() =>
        show.value ? span({ "data-testid": "async-el" }, "Here") : null,
      ),
    );

    setTimeout(() => {
      show.value = true;
    }, 50);

    const el = await screen.findByTestId("async-el", { timeout: 500 });
    expect(el.textContent).toBe("Here");
  });
});

// ── userEvent ─────────────────────────────────────────────────────────────

describe("userEvent.type", () => {
  it("types text character by character", async () => {
    const value = signal("");
    render(
      input({
        type: "text",
        oninput: (e: InputEvent) => {
          value.value = (e.target as HTMLInputElement).value;
        },
      }),
    );

    const el = screen.getByRole("textbox");
    await userEvent.type(el, "hello");
    expect((el as HTMLInputElement).value).toBe("hello");
    expect(value.value).toBe("hello");
  });
});

describe("userEvent.clear", () => {
  it("clears input value", async () => {
    const value = signal("initial");
    render(
      input({
        type: "text",
        value: "initial",
        oninput: (e: InputEvent) => {
          value.value = (e.target as HTMLInputElement).value;
        },
      }),
    );

    const el = screen.getByRole("textbox") as HTMLInputElement;
    el.value = "initial";
    await userEvent.clear(el);
    expect(el.value).toBe("");
    expect(value.value).toBe("");
  });
});

describe("userEvent.click", () => {
  it("fires mousedown, mouseup, and click in sequence", async () => {
    const events: string[] = [];
    render(
      button(
        {
          onmousedown: () => events.push("mousedown"),
          onmouseup: () => events.push("mouseup"),
          onclick: () => events.push("click"),
        },
        "Test",
      ),
    );

    await userEvent.click(screen.getByRole("button"));
    expect(events).toEqual(["mousedown", "mouseup", "click"]);
  });
});

describe("userEvent.tab", () => {
  it("moves focus to next focusable element", async () => {
    render(
      div(
        input({ type: "text", "data-testid": "first" }),
        input({ type: "text", "data-testid": "second" }),
        input({ type: "text", "data-testid": "third" }),
      ),
    );

    const first = screen.getByTestId("first") as HTMLElement;
    first.focus();

    await userEvent.tab();
    expect(document.activeElement).toBe(screen.getByTestId("second"));

    await userEvent.tab();
    expect(document.activeElement).toBe(screen.getByTestId("third"));
  });

  it("shift+tab moves focus backwards", async () => {
    render(
      div(
        input({ type: "text", "data-testid": "first" }),
        input({ type: "text", "data-testid": "second" }),
      ),
    );

    const second = screen.getByTestId("second") as HTMLElement;
    second.focus();

    await userEvent.tab({ shift: true });
    expect(document.activeElement).toBe(screen.getByTestId("first"));
  });
});

describe("userEvent.selectOptions", () => {
  it("selects option by value", async () => {
    const selected = signal("");
    render(
      select(
        {
          onchange: (e: Event) => {
            selected.value = (e.target as HTMLSelectElement).value;
          },
        },
        option({ value: "a" }, "Option A"),
        option({ value: "b" }, "Option B"),
        option({ value: "c" }, "Option C"),
      ),
    );

    const el = screen.getByRole("combobox");
    await userEvent.selectOptions(el, "b");
    expect(selected.value).toBe("b");
  });
});

// ── Reactive component integration ────────────────────────────────────────

describe("reactive component integration", () => {
  it("works with reactive components", () => {
    const Counter = component(() => {
      const count = signal(0);
      return div(
        button({ onclick: () => count.value++ }, "+"),
        span(() => String(count.value)),
      );
    });

    render(Counter({}));

    expect(screen.getByText("0")).toBeTruthy();

    fireEvent.click(screen.getByText("+"));

    expect(screen.getByText("1")).toBeTruthy();
  });

  it("works with async state updates", async () => {
    const Counter = component(() => {
      const count = signal(0);
      return div(
        button(
          {
            onclick: () => {
              setTimeout(() => {
                count.value = 99;
              }, 50);
            },
          },
          "Load",
        ),
        span({ "data-testid": "count" }, () => String(count.value)),
      );
    });

    render(Counter({}));
    fireEvent.click(screen.getByText("Load"));

    await waitFor(
      () => {
        expect(screen.getByTestId("count").textContent).toBe("99");
      },
      { timeout: 500 },
    );
  });
});
