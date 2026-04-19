import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { signal } from "../reactive.js";
import { input, textarea, select, option, mount } from "../elements.js";
import { bind } from "../bind.js";

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
