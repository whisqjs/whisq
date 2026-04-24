import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { signal } from "../reactive.js";
import { input, mount } from "../elements.js";
import { bind } from "../bind.js";
import { bindField } from "../bindField.js";
import { bindPath } from "../bindPath.js";
import { compose } from "../compose.js";
import { WHISQ_BIND_SOURCES } from "../bind-sentinel.js";

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

describe("compose() — text bind", () => {
  it("runs both bind's oninput and the user handler on input events", () => {
    const name = signal("");
    const track = vi.fn();
    dispose = mount(
      input({ ...compose(bind(name), { oninput: track }) }),
      container,
    );
    const el = container.querySelector("input") as HTMLInputElement;
    el.value = "grace";
    el.dispatchEvent(new InputEvent("input"));
    expect(name.value).toBe("grace");
    expect(track).toHaveBeenCalledTimes(1);
  });

  it("calls bind's handler before the user's handler (bind first)", () => {
    const name = signal("ada");
    const order: string[] = [];
    const track = vi.fn((e: Event) => {
      order.push(`user:${name.value}:${(e.target as HTMLInputElement).value}`);
    });
    // bind writes to name before user reads it, so user sees the post-write value.
    dispose = mount(
      input({ ...compose(bind(name), { oninput: track }) }),
      container,
    );
    const el = container.querySelector("input") as HTMLInputElement;
    el.value = "grace";
    el.dispatchEvent(new InputEvent("input"));
    expect(order).toEqual(["user:grace:grace"]);
  });

  it("works regardless of spread order of compose result (order-independent goal)", () => {
    const name = signal("");
    const track = vi.fn();
    dispose = mount(
      input({
        placeholder: "typed before",
        ...compose(bind(name), { oninput: track }),
      }),
      container,
    );
    const el = container.querySelector("input") as HTMLInputElement;
    el.value = "x";
    el.dispatchEvent(new InputEvent("input"));
    expect(name.value).toBe("x");
    expect(track).toHaveBeenCalledTimes(1);
    expect(el.placeholder).toBe("typed before");
  });
});

describe("compose() — checkbox / radio bind", () => {
  it("composes onchange for checkbox bind", () => {
    const agreed = signal(false);
    const track = vi.fn();
    dispose = mount(
      input({
        type: "checkbox",
        ...compose(bind(agreed, { as: "checkbox" }), { onchange: track }),
      }),
      container,
    );
    const el = container.querySelector("input") as HTMLInputElement;
    el.checked = true;
    el.dispatchEvent(new Event("change"));
    expect(agreed.value).toBe(true);
    expect(track).toHaveBeenCalledTimes(1);
  });

  it("composes onchange for radio bind", () => {
    const role = signal<"admin" | "user">("user");
    const track = vi.fn();
    dispose = mount(
      input({
        type: "radio",
        name: "role",
        ...compose(bind(role, { as: "radio", value: "admin" }), {
          onchange: track,
        }),
      }),
      container,
    );
    const el = container.querySelector("input") as HTMLInputElement;
    el.checked = true;
    el.dispatchEvent(new Event("change"));
    expect(role.value).toBe("admin");
    expect(track).toHaveBeenCalledTimes(1);
  });
});

describe("compose() — bindField / bindPath", () => {
  it("composes with bindField over a keyed row", () => {
    interface Todo {
      id: string;
      text: string;
      done: boolean;
    }
    const todos = signal<Todo[]>([{ id: "a", text: "write", done: false }]);
    const track = vi.fn();
    const row = () => todos.value[0]!;
    dispose = mount(
      input({
        type: "checkbox",
        ...compose(bindField(todos, row, "done", { as: "checkbox" }), {
          onchange: track,
        }),
      }),
      container,
    );
    const el = container.querySelector("input") as HTMLInputElement;
    el.checked = true;
    el.dispatchEvent(new Event("change"));
    expect(todos.value[0]!.done).toBe(true);
    expect(track).toHaveBeenCalledTimes(1);
  });

  it("composes with bindPath over a nested field", () => {
    interface User {
      profile: { name: string };
    }
    const user = signal<User>({ profile: { name: "" } });
    const track = vi.fn();
    dispose = mount(
      input({
        ...compose(bindPath(user, ["profile", "name"]), { oninput: track }),
      }),
      container,
    );
    const el = container.querySelector("input") as HTMLInputElement;
    el.value = "grace";
    el.dispatchEvent(new InputEvent("input"));
    expect(user.value.profile.name).toBe("grace");
    expect(track).toHaveBeenCalledTimes(1);
  });
});

describe("compose() — prop merging semantics", () => {
  it("lets extras overwrite non-handler props (normal spread semantics)", () => {
    const name = signal("");
    const merged = compose(bind(name), {
      placeholder: "from extras",
    } as Record<string, unknown>);
    expect((merged as Record<string, unknown>).placeholder).toBe("from extras");
  });

  it("passes through new handler keys from extras with no bind counterpart", () => {
    const name = signal("");
    const onFocus = vi.fn();
    dispose = mount(
      input({ ...compose(bind(name), { onfocus: onFocus }) }),
      container,
    );
    const el = container.querySelector("input") as HTMLInputElement;
    el.dispatchEvent(new Event("focus"));
    expect(onFocus).toHaveBeenCalledTimes(1);
  });
});

describe("compose() — sentinel integration", () => {
  it("does NOT emit the spread-overwrite dev warning on a compose result", () => {
    const name = signal("");
    const track = vi.fn();
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
    dispose = mount(
      input({ ...compose(bind(name), { oninput: track }) }),
      container,
    );
    expect(warn).not.toHaveBeenCalled();
    warn.mockRestore();
  });

  it("still warns if the compose result is then overwritten (direction-1 on compose output)", () => {
    const name = signal("");
    const track = vi.fn();
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
    dispose = mount(
      input({
        ...compose(bind(name), { oninput: track }),
        oninput: () => {
          /* overwrites the composed handler */
        },
      }),
      container,
    );
    expect(warn).toHaveBeenCalled();
    const message = warn.mock.calls[0]?.[0];
    expect(String(message)).toMatch(/duplicate handler|bind\(\)/i);
    warn.mockRestore();
  });

  it("re-tags the sentinel to reflect the composed handler", () => {
    const name = signal("");
    const track = vi.fn();
    const composed = compose(bind(name), { oninput: track }) as Record<
      string,
      unknown
    > & { [k: symbol]: unknown };
    const sources = composed[WHISQ_BIND_SOURCES] as
      | Record<string, unknown>
      | undefined;
    expect(sources).toBeDefined();
    expect(sources!.oninput).toBe(composed.oninput);
  });
});
