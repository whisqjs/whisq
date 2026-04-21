import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { signal } from "../reactive.js";
import { input, mount, each, ul } from "../elements.js";
import { bindField } from "../bindField.js";

interface Todo {
  id: string;
  text: string;
  done: boolean;
  priority: number;
}

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

describe("bindField() — checkbox (field inside array item)", () => {
  it("reflects the field's initial value on the DOM", () => {
    const todos = signal<Todo[]>([
      { id: "a", text: "x", done: true, priority: 0 },
    ]);
    dispose = mount(
      ul(
        each(
          () => todos.value,
          (todo) =>
            input({
              type: "checkbox",
              ...bindField(todos, todo, "done", { as: "checkbox" }),
            }),
          { key: (t) => t.id },
        ),
      ),
      container,
    );
    const el = container.querySelector("input") as HTMLInputElement;
    expect(el.checked).toBe(true);
  });

  it("writes an immutable array update when the user toggles", () => {
    const todos = signal<Todo[]>([
      { id: "a", text: "x", done: false, priority: 0 },
      { id: "b", text: "y", done: false, priority: 0 },
    ]);
    const before = todos.value;
    dispose = mount(
      ul(
        each(
          () => todos.value,
          (todo) =>
            input({
              type: "checkbox",
              ...bindField(todos, todo, "done", { as: "checkbox" }),
            }),
          { key: (t) => t.id },
        ),
      ),
      container,
    );
    const [first] = container.querySelectorAll("input");
    (first as HTMLInputElement).checked = true;
    first.dispatchEvent(new Event("change"));

    expect(todos.value).not.toBe(before);
    expect(todos.value[0]).not.toBe(before[0]);
    expect(todos.value[1]).toBe(before[1]);
    expect(todos.value[0]).toEqual({
      id: "a",
      text: "x",
      done: true,
      priority: 0,
    });
  });

  it("propagates programmatic field updates back to the DOM", () => {
    const todos = signal<Todo[]>([
      { id: "a", text: "x", done: false, priority: 0 },
    ]);
    dispose = mount(
      ul(
        each(
          () => todos.value,
          (todo) =>
            input({
              type: "checkbox",
              ...bindField(todos, todo, "done", { as: "checkbox" }),
            }),
          { key: (t) => t.id },
        ),
      ),
      container,
    );
    const el = container.querySelector("input") as HTMLInputElement;
    expect(el.checked).toBe(false);
    todos.value = todos.value.map((t) =>
      t.id === "a" ? { ...t, done: true } : t,
    );
    expect(el.checked).toBe(true);
  });

  it("survives keyed array replacement (items reordered)", () => {
    const todos = signal<Todo[]>([
      { id: "a", text: "x", done: false, priority: 0 },
      { id: "b", text: "y", done: true, priority: 0 },
    ]);
    dispose = mount(
      ul(
        each(
          () => todos.value,
          (todo) =>
            input({
              type: "checkbox",
              ...bindField(todos, todo, "done", { as: "checkbox" }),
            }),
          { key: (t) => t.id },
        ),
      ),
      container,
    );
    // Reorder — keyed each should retain DOM nodes but swap positions.
    todos.value = [todos.value[1], todos.value[0]];
    const [first, second] = container.querySelectorAll("input");
    expect((first as HTMLInputElement).checked).toBe(true); // was b
    expect((second as HTMLInputElement).checked).toBe(false); // was a

    // Write to the newly-first checkbox — must still target item "b".
    (first as HTMLInputElement).checked = false;
    first.dispatchEvent(new Event("change"));
    expect(todos.value.find((t) => t.id === "b")?.done).toBe(false);
    expect(todos.value.find((t) => t.id === "a")?.done).toBe(false);
  });
});

describe("bindField() — text / number / radio", () => {
  it("handles text fields via oninput", () => {
    const todos = signal<Todo[]>([
      { id: "a", text: "old", done: false, priority: 0 },
    ]);
    dispose = mount(
      ul(
        each(
          () => todos.value,
          (todo) => input({ ...bindField(todos, todo, "text") }),
          { key: (t) => t.id },
        ),
      ),
      container,
    );
    const el = container.querySelector("input") as HTMLInputElement;
    expect(el.value).toBe("old");
    el.value = "new";
    el.dispatchEvent(new InputEvent("input"));
    expect(todos.value[0].text).toBe("new");
  });

  it("handles numeric fields with as: number", () => {
    const todos = signal<Todo[]>([
      { id: "a", text: "x", done: false, priority: 3 },
    ]);
    dispose = mount(
      ul(
        each(
          () => todos.value,
          (todo) =>
            input({
              type: "number",
              ...bindField(todos, todo, "priority", { as: "number" }),
            }),
          { key: (t) => t.id },
        ),
      ),
      container,
    );
    const el = container.querySelector("input") as HTMLInputElement;
    expect(el.value).toBe("3");
    el.value = "9";
    el.dispatchEvent(new InputEvent("input"));
    expect(todos.value[0].priority).toBe(9);
  });

  it("ignores NaN on numeric write (no source mutation)", () => {
    const todos = signal<Todo[]>([
      { id: "a", text: "x", done: false, priority: 3 },
    ]);
    const before = todos.value;
    dispose = mount(
      ul(
        each(
          () => todos.value,
          (todo) =>
            input({
              type: "number",
              ...bindField(todos, todo, "priority", { as: "number" }),
            }),
          { key: (t) => t.id },
        ),
      ),
      container,
    );
    const el = container.querySelector("input") as HTMLInputElement;
    el.value = "";
    el.dispatchEvent(new InputEvent("input"));
    expect(todos.value).toBe(before);
    expect(todos.value[0].priority).toBe(3);
  });

  it("handles radio with as: radio", () => {
    interface Row {
      id: string;
      role: "admin" | "user";
    }
    const rows = signal<Row[]>([{ id: "a", role: "user" }]);
    dispose = mount(
      ul(
        each(
          () => rows.value,
          (row) =>
            input({
              type: "radio",
              name: "role",
              ...bindField(rows, row, "role", {
                as: "radio",
                value: "admin",
              }),
            }),
          { key: (r) => r.id },
        ),
      ),
      container,
    );
    const el = container.querySelector("input") as HTMLInputElement;
    expect(el.checked).toBe(false);
    rows.value = [{ id: "a", role: "admin" }];
    expect(el.checked).toBe(true);
  });
});

describe("bindField() — keyBy", () => {
  it("defaults to .id for item matching", () => {
    const todos = signal<Todo[]>([
      { id: "a", text: "x", done: false, priority: 0 },
    ]);
    dispose = mount(
      ul(
        each(
          () => todos.value,
          (todo) =>
            input({
              type: "checkbox",
              ...bindField(todos, todo, "done", { as: "checkbox" }),
            }),
          { key: (t) => t.id },
        ),
      ),
      container,
    );
    const el = container.querySelector("input") as HTMLInputElement;
    el.checked = true;
    el.dispatchEvent(new Event("change"));
    expect(todos.value[0].done).toBe(true);
  });

  it("accepts a custom keyBy when items are keyed on something other than id", () => {
    interface Row {
      uuid: string;
      done: boolean;
    }
    const rows = signal<Row[]>([{ uuid: "x-1", done: false }]);
    dispose = mount(
      ul(
        each(
          () => rows.value,
          (row) =>
            input({
              type: "checkbox",
              ...bindField(rows, row, "done", {
                as: "checkbox",
                keyBy: (r) => r.uuid,
              }),
            }),
          { key: (r) => r.uuid },
        ),
      ),
      container,
    );
    const el = container.querySelector("input") as HTMLInputElement;
    el.checked = true;
    el.dispatchEvent(new Event("change"));
    expect(rows.value[0].done).toBe(true);
  });

  it("warns and discards the write when no item matches", () => {
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
    const todos = signal<Todo[]>([
      { id: "a", text: "x", done: false, priority: 0 },
    ]);
    // Access the item, then remove it from the source, then attempt a write.
    const accessor = () => todos.value[0] ?? { id: "missing" };
    const props = bindField(todos, accessor as () => Todo, "done", {
      as: "checkbox",
    });
    todos.value = []; // item gone
    (props as { onchange: (e: Event) => void }).onchange({
      target: { checked: true } as HTMLInputElement,
    } as unknown as Event);
    expect(warn).toHaveBeenCalledWith(
      expect.stringContaining("no item in source matched"),
    );
    expect(todos.value).toEqual([]);
    warn.mockRestore();
  });
});

describe("bindField() — input validation", () => {
  it("throws TypeError when source is not a signal", () => {
    expect(() =>
      bindField(
        {} as never,
        (() => ({})) as unknown as () => { id: string },
        "id",
      ),
    ).toThrow(TypeError);
  });

  it("throws TypeError when item is not a function", () => {
    const todos = signal<Todo[]>([]);
    expect(() =>
      bindField(todos, "not a function" as unknown as () => Todo, "done"),
    ).toThrow(TypeError);
  });
});
