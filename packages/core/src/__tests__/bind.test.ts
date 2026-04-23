import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { signal } from "../reactive.js";
import { input, textarea, select, option, mount } from "../elements.js";
import { bind } from "../bind.js";
import { bindField } from "../bindField.js";
import { bindPath } from "../bindPath.js";

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

describe("bind() — text input", () => {
  it("reflects initial signal value into DOM", () => {
    const name = signal("ada");
    dispose = mount(input({ ...bind(name) }), container);
    const el = container.querySelector("input") as HTMLInputElement;
    expect(el.value).toBe("ada");
  });

  it("updates signal when user types into the input", () => {
    const name = signal("");
    dispose = mount(input({ ...bind(name) }), container);
    const el = container.querySelector("input") as HTMLInputElement;
    el.value = "grace";
    el.dispatchEvent(new InputEvent("input"));
    expect(name.value).toBe("grace");
  });

  it("propagates programmatic signal updates to DOM", () => {
    const name = signal("ada");
    dispose = mount(input({ ...bind(name) }), container);
    const el = container.querySelector("input") as HTMLInputElement;
    name.value = "grace";
    expect(el.value).toBe("grace");
  });
});

describe("bind() — number input", () => {
  it("parses numeric input via valueAsNumber", () => {
    const age = signal(0);
    dispose = mount(
      input({ type: "number", ...bind(age, { as: "number" }) }),
      container,
    );
    const el = container.querySelector("input") as HTMLInputElement;
    el.value = "42";
    el.dispatchEvent(new InputEvent("input"));
    expect(age.value).toBe(42);
  });

  it("ignores NaN (e.g. empty string) keeping signal at previous value", () => {
    const age = signal(7);
    dispose = mount(
      input({ type: "number", ...bind(age, { as: "number" }) }),
      container,
    );
    const el = container.querySelector("input") as HTMLInputElement;
    el.value = "";
    el.dispatchEvent(new InputEvent("input"));
    expect(age.value).toBe(7);
  });

  it("reflects signal value as DOM string", () => {
    const age = signal(21);
    dispose = mount(
      input({ type: "number", ...bind(age, { as: "number" }) }),
      container,
    );
    const el = container.querySelector("input") as HTMLInputElement;
    expect(el.value).toBe("21");
    age.value = 99;
    expect(el.value).toBe("99");
  });
});

describe("bind() — checkbox", () => {
  it("reflects signal as checked", () => {
    const agreed = signal(true);
    dispose = mount(
      input({ type: "checkbox", ...bind(agreed, { as: "checkbox" }) }),
      container,
    );
    const el = container.querySelector("input") as HTMLInputElement;
    expect(el.checked).toBe(true);
    agreed.value = false;
    expect(el.checked).toBe(false);
  });

  it("toggles signal on change", () => {
    const agreed = signal(false);
    dispose = mount(
      input({ type: "checkbox", ...bind(agreed, { as: "checkbox" }) }),
      container,
    );
    const el = container.querySelector("input") as HTMLInputElement;
    el.checked = true;
    el.dispatchEvent(new Event("change"));
    expect(agreed.value).toBe(true);
    el.checked = false;
    el.dispatchEvent(new Event("change"));
    expect(agreed.value).toBe(false);
  });
});

describe("bind() — radio", () => {
  it("sets checked only when signal equals the radio's value", () => {
    const role = signal<"admin" | "user">("user");
    dispose = mount(
      input({
        type: "radio",
        name: "role",
        ...bind(role, { as: "radio", value: "admin" }),
      }),
      container,
    );
    const el = container.querySelector("input") as HTMLInputElement;
    expect(el.checked).toBe(false);
    role.value = "admin";
    expect(el.checked).toBe(true);
  });

  it("sets signal to the radio's value on change", () => {
    const role = signal<"admin" | "user">("user");
    dispose = mount(
      input({
        type: "radio",
        name: "role",
        ...bind(role, { as: "radio", value: "admin" }),
      }),
      container,
    );
    const el = container.querySelector("input") as HTMLInputElement;
    el.checked = true;
    el.dispatchEvent(new Event("change"));
    expect(role.value).toBe("admin");
  });
});

describe("bind() — textarea and select", () => {
  it("works with textarea (string signal)", () => {
    const notes = signal("hi");
    dispose = mount(textarea({ ...bind(notes) }), container);
    const el = container.querySelector("textarea") as HTMLTextAreaElement;
    expect(el.value).toBe("hi");
    el.value = "updated";
    el.dispatchEvent(new InputEvent("input"));
    expect(notes.value).toBe("updated");
  });

  it("works with select (string signal)", () => {
    const role = signal("user");
    dispose = mount(
      select(
        { ...bind(role) },
        option({ value: "user" }, "User"),
        option({ value: "admin" }, "Admin"),
      ),
      container,
    );
    const el = container.querySelector("select") as HTMLSelectElement;
    expect(el.value).toBe("user");
    el.value = "admin";
    el.dispatchEvent(new InputEvent("input"));
    expect(role.value).toBe("admin");
  });
});

describe("bind() — input validation", () => {
  it("throws TypeError when first argument is not a signal", () => {
    expect(() => bind({} as never)).toThrow(TypeError);
    expect(() => bind(null as never)).toThrow(TypeError);
    expect(() => bind("not a signal" as never)).toThrow(TypeError);
  });
});

// ── Duplicate-handler dev warning (WHISQ-120) ───────────────────────────────
//
// Dev-only detection of the "spread bind() then overwrite the same event
// handler" footgun. The sentinel mechanism lives in bind-sentinel.ts and
// catches direction 1 (spread first, user handler second). Direction 2
// (user handler first, bind spread second) isn't detectable from final
// props — documented limitation.

describe("bind() duplicate-handler warning (direction 1)", () => {
  let warn: ReturnType<typeof vi.spyOn>;
  beforeEach(() => {
    warn = vi.spyOn(console, "warn").mockImplementation(() => {});
  });
  afterEach(() => {
    warn.mockRestore();
  });

  it("warns when ...bind(sig) is followed by an overriding oninput", () => {
    const name = signal("");
    dispose = mount(
      input({ ...bind(name), oninput: () => {} }),
      container,
    );
    expect(warn).toHaveBeenCalledTimes(1);
    const msg = warn.mock.calls[0]![0] as string;
    expect(msg).toContain("duplicate handler");
    expect(msg).toContain('"oninput"');
    expect(msg).toContain("<input>");
  });

  it("warns when ...bind(sig, checkbox) is followed by an overriding onchange", () => {
    const agreed = signal(false);
    dispose = mount(
      input({
        type: "checkbox",
        ...bind(agreed, { as: "checkbox" }),
        onchange: () => {},
      }),
      container,
    );
    expect(warn).toHaveBeenCalledTimes(1);
    const msg = warn.mock.calls[0]![0] as string;
    expect(msg).toContain('"onchange"');
  });

  it("does NOT warn on the clean use — ...bind(sig) alone", () => {
    const name = signal("");
    dispose = mount(input({ ...bind(name) }), container);
    expect(warn).not.toHaveBeenCalled();
  });

  it("warns once per overwritten handler (not per key in the sentinel)", () => {
    // bind() text returns { value, oninput }. value is not an on* handler,
    // so only oninput is tracked. Overwriting oninput → one warning.
    // Overwriting value (a non-handler) → no warning.
    const name = signal("");
    dispose = mount(
      input({ ...bind(name), value: "override", oninput: () => {} }),
      container,
    );
    expect(warn).toHaveBeenCalledTimes(1);
  });

  it("does NOT warn in production", () => {
    const originalEnv = process.env.NODE_ENV;
    process.env.NODE_ENV = "production";
    try {
      const name = signal("");
      dispose = mount(
        input({ ...bind(name), oninput: () => {} }),
        container,
      );
      expect(warn).not.toHaveBeenCalled();
    } finally {
      process.env.NODE_ENV = originalEnv;
    }
  });

  it("known limitation: does NOT warn when user handler is written first, then bind is spread on top (direction 2)", () => {
    // This is an honest acknowledgement of the runtime limitation — by the
    // time the element builder sees props, direction-2 overwrites have
    // already lost their trace. The user's handler is gone, but the sentinel
    // matches the current oninput so no warning fires. Documented in the
    // warning message's hint: "spread bind LAST so your handler is the one
    // that gets wiped (usually the bug you want)."
    const name = signal("");
    dispose = mount(
      input({ oninput: () => {}, ...bind(name) }),
      container,
    );
    expect(warn).not.toHaveBeenCalled();
  });
});

describe("bindField() duplicate-handler warning (direction 1)", () => {
  let warn: ReturnType<typeof vi.spyOn>;
  beforeEach(() => {
    warn = vi.spyOn(console, "warn").mockImplementation(() => {});
  });
  afterEach(() => {
    warn.mockRestore();
  });

  it("warns when bindField's onchange is overwritten by a later handler", () => {
    type Todo = { id: string; done: boolean };
    const todos = signal<Todo[]>([{ id: "a", done: false }]);
    const todo = () => todos.value[0]!;
    dispose = mount(
      input({
        type: "checkbox",
        ...bindField(todos, todo, "done", { as: "checkbox" }),
        onchange: () => {},
      }),
      container,
    );
    expect(warn).toHaveBeenCalledWith(
      expect.stringContaining('"onchange"'),
    );
  });
});

describe("bindPath() duplicate-handler warning (direction 1)", () => {
  let warn: ReturnType<typeof vi.spyOn>;
  beforeEach(() => {
    warn = vi.spyOn(console, "warn").mockImplementation(() => {});
  });
  afterEach(() => {
    warn.mockRestore();
  });

  it("warns when bindPath's oninput is overwritten by a later handler", () => {
    type User = { profile: { email: string } };
    const user = signal<User>({ profile: { email: "" } });
    dispose = mount(
      input({
        ...bindPath(user, ["profile", "email"]),
        oninput: () => {},
      }),
      container,
    );
    expect(warn).toHaveBeenCalledWith(
      expect.stringContaining('"oninput"'),
    );
  });
});
