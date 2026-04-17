import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { signal } from "../reactive.js";
import { each, ul, li, div, span, mount } from "../elements.js";
import type { WhisqNode } from "../elements.js";

// ── Test helpers ────────────────────────────────────────────────────────────

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

function textContent(el: Element): string[] {
  return Array.from(el.children).map((c) => c.textContent ?? "");
}

// Flush effects (synchronous in Whisq)
function flush() {
  // Whisq effects are synchronous, no flushing needed
}

// ── Non-keyed each() (existing behavior) ────────────────────────────────────

describe("each() without key (index-based)", () => {
  it("renders an initial list", () => {
    const items = signal(["a", "b", "c"]);
    const node = ul(
      each(
        () => items.value,
        (item) => li(item),
      ),
    );
    dispose = mount(node, container);

    expect(textContent(container.firstElementChild!)).toEqual(["a", "b", "c"]);
  });

  it("updates when items change", () => {
    const items = signal(["a", "b"]);
    const node = ul(
      each(
        () => items.value,
        (item) => li(item),
      ),
    );
    dispose = mount(node, container);

    items.value = ["a", "b", "c"];
    flush();

    expect(textContent(container.firstElementChild!)).toEqual(["a", "b", "c"]);
  });

  it("renders an empty list", () => {
    const items = signal<string[]>([]);
    const node = ul(
      each(
        () => items.value,
        (item) => li(item),
      ),
    );
    dispose = mount(node, container);

    expect(textContent(container.firstElementChild!)).toEqual([]);
  });
});

// ── Keyed each() ────────────────────────────────────────────────────────────

interface Item {
  id: number;
  text: string;
}

function makeItems(...texts: string[]): Item[] {
  return texts.map((text, i) => ({ id: i + 1, text }));
}

describe("each() with key", () => {
  it("renders an initial keyed list", () => {
    const items = signal(makeItems("a", "b", "c"));
    const node = ul(
      each(
        () => items.value,
        (item) => li(item.text),
        { key: (item) => item.id },
      ),
    );
    dispose = mount(node, container);

    expect(textContent(container.firstElementChild!)).toEqual(["a", "b", "c"]);
  });

  it("appends item to end", () => {
    const items = signal(makeItems("a", "b"));
    const node = ul(
      each(
        () => items.value,
        (item) => li(item.text),
        { key: (item) => item.id },
      ),
    );
    dispose = mount(node, container);

    items.value = [...items.peek(), { id: 3, text: "c" }];
    flush();

    expect(textContent(container.firstElementChild!)).toEqual(["a", "b", "c"]);
  });

  it("prepends item to beginning", () => {
    const items = signal(makeItems("b", "c"));
    const node = ul(
      each(
        () => items.value,
        (item) => li(item.text),
        { key: (item) => item.id },
      ),
    );
    dispose = mount(node, container);

    items.value = [{ id: 0, text: "a" }, ...items.peek()];
    flush();

    expect(textContent(container.firstElementChild!)).toEqual(["a", "b", "c"]);
  });

  it("inserts item in the middle", () => {
    const items = signal([
      { id: 1, text: "a" },
      { id: 3, text: "c" },
    ]);
    const node = ul(
      each(
        () => items.value,
        (item) => li(item.text),
        { key: (item) => item.id },
      ),
    );
    dispose = mount(node, container);

    items.value = [
      { id: 1, text: "a" },
      { id: 2, text: "b" },
      { id: 3, text: "c" },
    ];
    flush();

    expect(textContent(container.firstElementChild!)).toEqual(["a", "b", "c"]);
  });

  it("removes item from end", () => {
    const items = signal(makeItems("a", "b", "c"));
    const node = ul(
      each(
        () => items.value,
        (item) => li(item.text),
        { key: (item) => item.id },
      ),
    );
    dispose = mount(node, container);

    items.value = items.peek().slice(0, 2);
    flush();

    expect(textContent(container.firstElementChild!)).toEqual(["a", "b"]);
  });

  it("removes item from beginning", () => {
    const items = signal(makeItems("a", "b", "c"));
    const node = ul(
      each(
        () => items.value,
        (item) => li(item.text),
        { key: (item) => item.id },
      ),
    );
    dispose = mount(node, container);

    items.value = items.peek().slice(1);
    flush();

    expect(textContent(container.firstElementChild!)).toEqual(["b", "c"]);
  });

  it("removes item from middle", () => {
    const items = signal(makeItems("a", "b", "c"));
    const node = ul(
      each(
        () => items.value,
        (item) => li(item.text),
        { key: (item) => item.id },
      ),
    );
    dispose = mount(node, container);

    items.value = [items.peek()[0], items.peek()[2]];
    flush();

    expect(textContent(container.firstElementChild!)).toEqual(["a", "c"]);
  });

  it("swaps two items", () => {
    const items = signal(makeItems("a", "b"));
    const node = ul(
      each(
        () => items.value,
        (item) => li(item.text),
        { key: (item) => item.id },
      ),
    );
    dispose = mount(node, container);

    const [first, second] = items.peek();
    items.value = [second, first];
    flush();

    expect(textContent(container.firstElementChild!)).toEqual(["b", "a"]);
  });

  it("reverses the list", () => {
    const items = signal(makeItems("a", "b", "c", "d"));
    const node = ul(
      each(
        () => items.value,
        (item) => li(item.text),
        { key: (item) => item.id },
      ),
    );
    dispose = mount(node, container);

    items.value = [...items.peek()].reverse();
    flush();

    expect(textContent(container.firstElementChild!)).toEqual([
      "d",
      "c",
      "b",
      "a",
    ]);
  });

  it("replaces entire list", () => {
    const items = signal(makeItems("a", "b"));
    const node = ul(
      each(
        () => items.value,
        (item) => li(item.text),
        { key: (item) => item.id },
      ),
    );
    dispose = mount(node, container);

    items.value = [
      { id: 10, text: "x" },
      { id: 20, text: "y" },
    ];
    flush();

    expect(textContent(container.firstElementChild!)).toEqual(["x", "y"]);
  });

  it("transitions from empty to populated", () => {
    const items = signal<Item[]>([]);
    const node = ul(
      each(
        () => items.value,
        (item) => li(item.text),
        { key: (item) => item.id },
      ),
    );
    dispose = mount(node, container);

    expect(textContent(container.firstElementChild!)).toEqual([]);

    items.value = makeItems("a", "b");
    flush();

    expect(textContent(container.firstElementChild!)).toEqual(["a", "b"]);
  });

  it("transitions from populated to empty", () => {
    const items = signal(makeItems("a", "b"));
    const node = ul(
      each(
        () => items.value,
        (item) => li(item.text),
        { key: (item) => item.id },
      ),
    );
    dispose = mount(node, container);

    items.value = [];
    flush();

    expect(textContent(container.firstElementChild!)).toEqual([]);
  });

  it("reuses DOM nodes for same keys", () => {
    const items = signal(makeItems("a", "b", "c"));
    const node = ul(
      each(
        () => items.value,
        (item) => li(item.text),
        { key: (item) => item.id },
      ),
    );
    dispose = mount(node, container);

    const ulEl = container.firstElementChild!;
    const originalFirst = ulEl.children[0];
    const originalThird = ulEl.children[2];

    // Remove middle item — first and third should be the same DOM nodes
    items.value = [items.peek()[0], items.peek()[2]];
    flush();

    expect(ulEl.children[0]).toBe(originalFirst);
    expect(ulEl.children[1]).toBe(originalThird);
  });

  it("reuses DOM nodes when reordering", () => {
    const items = signal(makeItems("a", "b", "c"));
    const node = ul(
      each(
        () => items.value,
        (item) => li(item.text),
        { key: (item) => item.id },
      ),
    );
    dispose = mount(node, container);

    const ulEl = container.firstElementChild!;
    const originalA = ulEl.children[0];
    const originalB = ulEl.children[1];
    const originalC = ulEl.children[2];

    // Reverse order
    items.value = [...items.peek()].reverse();
    flush();

    expect(ulEl.children[0]).toBe(originalC);
    expect(ulEl.children[1]).toBe(originalB);
    expect(ulEl.children[2]).toBe(originalA);
  });

  it("disposes removed nodes", () => {
    let disposeCount = 0;
    const items = signal(makeItems("a", "b", "c"));
    const node = ul(
      each(
        () => items.value,
        (item) => {
          const n = li(item.text);
          const origDispose = n.dispose;
          n.dispose = () => {
            disposeCount++;
            origDispose();
          };
          return n;
        },
        { key: (item) => item.id },
      ),
    );
    dispose = mount(node, container);

    // Remove two items
    items.value = [items.peek()[1]];
    flush();

    expect(disposeCount).toBe(2);
  });

  it("handles complex shuffle", () => {
    const items = signal(
      ["a", "b", "c", "d", "e"].map((t, i) => ({ id: i + 1, text: t })),
    );
    const node = ul(
      each(
        () => items.value,
        (item) => li(item.text),
        { key: (item) => item.id },
      ),
    );
    dispose = mount(node, container);

    // Shuffle: e, c, a, d, b
    const old = items.peek();
    items.value = [old[4], old[2], old[0], old[3], old[1]];
    flush();

    expect(textContent(container.firstElementChild!)).toEqual([
      "e",
      "c",
      "a",
      "d",
      "b",
    ]);
  });

  it("handles simultaneous add and remove", () => {
    const items = signal(makeItems("a", "b", "c"));
    const node = ul(
      each(
        () => items.value,
        (item) => li(item.text),
        { key: (item) => item.id },
      ),
    );
    dispose = mount(node, container);

    // Remove "b", add "d" at end
    items.value = [items.peek()[0], items.peek()[2], { id: 4, text: "d" }];
    flush();

    expect(textContent(container.firstElementChild!)).toEqual(["a", "c", "d"]);
  });

  it("handles multiple rapid updates", () => {
    const items = signal(makeItems("a"));
    const node = ul(
      each(
        () => items.value,
        (item) => li(item.text),
        { key: (item) => item.id },
      ),
    );
    dispose = mount(node, container);

    items.value = makeItems("a", "b");
    items.value = makeItems("a", "b", "c");
    items.value = [{ id: 2, text: "b" }];
    flush();

    expect(textContent(container.firstElementChild!)).toEqual(["b"]);
  });
});
