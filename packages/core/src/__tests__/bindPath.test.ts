import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { signal } from "../reactive.js";
import { input, mount } from "../elements.js";
// Imported from the internal path. Public import is `@whisq/core/forms`
// (see packages/core/package.json exports).
import { bindPath } from "../bindPath.js";

interface User {
  id: string;
  profile: { name: string; email: string; age: number };
  prefs: { dark: boolean; theme: "light" | "dark" };
}

const baseUser: User = {
  id: "u1",
  profile: { name: "ada", email: "a@b.c", age: 30 },
  prefs: { dark: false, theme: "light" },
};

let container: HTMLElement;
let dispose: (() => void) | undefined;

beforeEach(() => {
  container = document.createElement("div");
  document.body.appendChild(container);
});

afterEach(() => {
  if (dispose) dispose();
  container.remove();
  dispose = undefined;
});

describe("bindPath() — text (depth 2)", () => {
  it("reflects the nested field's initial value", () => {
    const user = signal(baseUser);
    dispose = mount(input({ ...bindPath(user, ["profile", "name"]) }), container);
    expect((container.querySelector("input") as HTMLInputElement).value).toBe("ada");
  });

  it("writes produce a new root with structural sharing on siblings", () => {
    const user = signal(baseUser);
    const before = user.value;
    dispose = mount(input({ ...bindPath(user, ["profile", "name"]) }), container);

    const el = container.querySelector("input") as HTMLInputElement;
    el.value = "grace";
    el.dispatchEvent(new InputEvent("input"));

    expect(user.value).not.toBe(before);
    expect(user.value.profile).not.toBe(before.profile);
    // Sibling branch `prefs` should remain the same reference.
    expect(user.value.prefs).toBe(before.prefs);
    expect(user.value.profile.name).toBe("grace");
    // Untouched sibling field on the same level also stable.
    expect(user.value.profile.email).toBe("a@b.c");
  });

  it("propagates programmatic updates to the DOM", () => {
    const user = signal(baseUser);
    dispose = mount(input({ ...bindPath(user, ["profile", "email"]) }), container);
    const el = container.querySelector("input") as HTMLInputElement;
    expect(el.value).toBe("a@b.c");
    user.value = { ...baseUser, profile: { ...baseUser.profile, email: "x@y.z" } };
    expect(el.value).toBe("x@y.z");
  });
});

describe("bindPath() — deeper paths (depth 3+)", () => {
  interface Org {
    name: string;
    settings: {
      billing: { plan: "free" | "pro"; seats: number };
      ui: { density: "compact" | "comfy" };
    };
  }

  const orgInitial: Org = {
    name: "acme",
    settings: {
      billing: { plan: "free", seats: 1 },
      ui: { density: "compact" },
    },
  };

  it("depth-3 text field", () => {
    const org = signal(orgInitial);
    dispose = mount(
      input({ ...bindPath(org, ["settings", "ui", "density"]) }),
      container,
    );
    const el = container.querySelector("input") as HTMLInputElement;
    expect(el.value).toBe("compact");
    el.value = "comfy";
    el.dispatchEvent(new InputEvent("input"));
    expect(org.value.settings.ui.density).toBe("comfy");
  });

  it("depth-3 write preserves structural sharing across cousins", () => {
    const org = signal(orgInitial);
    const before = org.value;
    dispose = mount(
      input({ ...bindPath(org, ["settings", "ui", "density"]) }),
      container,
    );

    const el = container.querySelector("input") as HTMLInputElement;
    el.value = "comfy";
    el.dispatchEvent(new InputEvent("input"));

    expect(org.value).not.toBe(before);
    expect(org.value.settings).not.toBe(before.settings);
    expect(org.value.settings.ui).not.toBe(before.settings.ui);
    // Cousin branch (`billing`) preserved by reference.
    expect(org.value.settings.billing).toBe(before.settings.billing);
  });
});

describe("bindPath() — number / checkbox / radio", () => {
  it("number field updates via valueAsNumber", () => {
    const user = signal(baseUser);
    dispose = mount(
      input({
        type: "number",
        ...bindPath(user, ["profile", "age"], { as: "number" }),
      }),
      container,
    );
    const el = container.querySelector("input") as HTMLInputElement;
    expect(el.value).toBe("30");
    el.value = "42";
    el.dispatchEvent(new InputEvent("input"));
    expect(user.value.profile.age).toBe(42);
  });

  it("number NaN guard leaves source untouched", () => {
    const user = signal(baseUser);
    const before = user.value;
    dispose = mount(
      input({
        type: "number",
        ...bindPath(user, ["profile", "age"], { as: "number" }),
      }),
      container,
    );
    const el = container.querySelector("input") as HTMLInputElement;
    el.value = "";
    el.dispatchEvent(new InputEvent("input"));
    expect(user.value).toBe(before);
    expect(user.value.profile.age).toBe(30);
  });

  it("checkbox binds deep boolean", () => {
    const user = signal(baseUser);
    dispose = mount(
      input({
        type: "checkbox",
        ...bindPath(user, ["prefs", "dark"], { as: "checkbox" }),
      }),
      container,
    );
    const el = container.querySelector("input") as HTMLInputElement;
    expect(el.checked).toBe(false);
    el.checked = true;
    el.dispatchEvent(new Event("change"));
    expect(user.value.prefs.dark).toBe(true);
  });

  it("radio binds deep string with as: radio / value", () => {
    const user = signal(baseUser);
    dispose = mount(
      input({
        type: "radio",
        name: "theme",
        ...bindPath(user, ["prefs", "theme"], { as: "radio", value: "dark" }),
      }),
      container,
    );
    const el = container.querySelector("input") as HTMLInputElement;
    expect(el.checked).toBe(false);
    user.value = { ...user.value, prefs: { ...user.value.prefs, theme: "dark" } };
    expect(el.checked).toBe(true);
  });
});

describe("bindPath() — input validation", () => {
  it("throws TypeError when source is not a Signal", () => {
    expect(() =>
      bindPath({} as never, ["x"] as never),
    ).toThrow(TypeError);
  });

  it("throws TypeError when path is empty", () => {
    const s = signal({ a: 1 });
    expect(() => bindPath(s, [] as unknown as ["a"])).toThrow(TypeError);
  });

  it("reading through a missing intermediate level returns a safe empty string", () => {
    interface Sparse {
      a?: { b?: string };
    }
    const s = signal<Sparse>({});
    dispose = mount(input({ ...bindPath(s, ["a", "b"]) }), container);
    const el = container.querySelector("input") as HTMLInputElement;
    expect(el.value).toBe("");
    // Writing through the missing intermediate creates the object structure.
    el.value = "created";
    el.dispatchEvent(new InputEvent("input"));
    expect(s.value.a?.b).toBe("created");
  });
});
