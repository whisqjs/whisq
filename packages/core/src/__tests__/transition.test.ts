import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { signal } from "../reactive.js";
import { transition, div, span, mount } from "../elements.js";
import type { WhisqNode } from "../elements.js";

// ── Mock Web Animations API ────────────────────────────────────────────────
// jsdom doesn't support Element.animate(), so we mock it.

interface MockAnimation {
  onfinish: (() => void) | null;
  cancel: ReturnType<typeof vi.fn>;
  finished: Promise<void>;
  _finish: () => void;
}

function createMockAnimation(): MockAnimation {
  let resolveFinished: () => void;
  const anim: MockAnimation = {
    onfinish: null,
    cancel: vi.fn(),
    finished: new Promise<void>((r) => {
      resolveFinished = r;
    }),
    _finish() {
      resolveFinished();
      if (anim.onfinish) anim.onfinish();
    },
  };
  return anim;
}

let lastAnimation: MockAnimation | null = null;

beforeEach(() => {
  lastAnimation = null;
  // @ts-expect-error — mock Web Animations API
  Element.prototype.animate = vi.fn(() => {
    const anim = createMockAnimation();
    lastAnimation = anim;
    return anim;
  });
});

afterEach(() => {
  // @ts-expect-error — cleanup mock
  delete Element.prototype.animate;
});

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

// ── transition() ───────────────────────────────────────────────────────────

describe("transition()", () => {
  it("plays enter animation on mount", () => {
    const node = transition(div("Hello"), {
      enter: { opacity: [0, 1], duration: 300 },
    });
    dispose = mount(node, container);

    expect(Element.prototype.animate).toHaveBeenCalledTimes(1);
    const call = (Element.prototype.animate as ReturnType<typeof vi.fn>).mock
      .calls[0];
    expect(call[0]).toEqual([{ opacity: 0 }, { opacity: 1 }]);
    expect(call[1]).toEqual(expect.objectContaining({ duration: 300 }));
  });

  it("plays exit animation before removal on dispose", async () => {
    const node = transition(div("Goodbye"), {
      exit: { opacity: [1, 0], duration: 200 },
    });

    // Manually append to test exit without mount's container clearing
    container.appendChild(node.el);

    // Reset mock from enter
    (Element.prototype.animate as ReturnType<typeof vi.fn>).mockClear();

    node.dispose();

    // Exit animation should have been called
    expect(Element.prototype.animate).toHaveBeenCalledTimes(1);
    const call = (Element.prototype.animate as ReturnType<typeof vi.fn>).mock
      .calls[0];
    expect(call[0]).toEqual([{ opacity: 1 }, { opacity: 0 }]);
    expect(call[1]).toEqual(expect.objectContaining({ duration: 200 }));

    // Element should still be in DOM during animation
    expect(container.textContent).toBe("Goodbye");

    // Finish the exit animation
    lastAnimation!._finish();
    await lastAnimation!.finished;

    // Now element should be removed
    expect(container.textContent).toBe("");
  });

  it("removes element immediately when no exit animation", () => {
    const node = transition(div("No exit"), {
      enter: { opacity: [0, 1], duration: 300 },
    });
    dispose = mount(node, container);

    expect(container.textContent).toBe("No exit");

    dispose();

    expect(container.textContent).toBe("");
  });

  it("works with enter only", () => {
    const node = transition(span("enter-only"), {
      enter: { opacity: [0, 1], duration: 150 },
    });
    dispose = mount(node, container);

    expect(container.textContent).toBe("enter-only");
    expect(Element.prototype.animate).toHaveBeenCalledTimes(1);
  });

  it("works with exit only", async () => {
    const node = transition(span("exit-only"), {
      exit: { opacity: [1, 0], duration: 100 },
    });
    dispose = mount(node, container);

    // No enter animation
    expect(Element.prototype.animate).not.toHaveBeenCalled();

    dispose();

    // Exit animation plays
    expect(Element.prototype.animate).toHaveBeenCalledTimes(1);

    lastAnimation!._finish();
    await lastAnimation!.finished;

    expect(container.textContent).toBe("");
  });

  it("disposes child effects after exit animation", async () => {
    const count = signal(0);
    let effectRuns = 0;

    const node = transition(
      div(
        span(() => {
          effectRuns++;
          return `${count.value}`;
        }),
      ),
      { exit: { opacity: [1, 0], duration: 200 } },
    );
    dispose = mount(node, container);

    expect(effectRuns).toBe(1);
    count.value = 1;
    expect(effectRuns).toBe(2);

    dispose();

    // During exit animation, effects should still be alive
    // (element is still visible)

    lastAnimation!._finish();
    await lastAnimation!.finished;

    // After exit, effects should be disposed
    count.value = 2;
    expect(effectRuns).toBe(2); // no additional runs
  });

  it("supports transform property", () => {
    const node = transition(div("Slide"), {
      enter: {
        transform: ["translateY(-20px)", "translateY(0)"],
        duration: 250,
      },
    });
    dispose = mount(node, container);

    const call = (Element.prototype.animate as ReturnType<typeof vi.fn>).mock
      .calls[0];
    expect(call[0]).toEqual([
      { transform: "translateY(-20px)" },
      { transform: "translateY(0)" },
    ]);
  });
});
