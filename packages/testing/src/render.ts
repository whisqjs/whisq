import { mount, type WhisqNode } from "@whisq/core";

// ── State ──────────────────────────────────────────────────────────────────

let currentContainer: HTMLElement | null = null;
let currentUnmount: (() => void) | null = null;

// ── render ─────────────────────────────────────────────────────────────────

export interface RenderResult {
  container: HTMLElement;
  unmount: () => void;
}

/**
 * Mount a WhisqNode into a test container in the document body.
 *
 * ```ts
 * const { container, unmount } = render(Counter({ initial: 0 }));
 * ```
 */
export function render(node: WhisqNode): RenderResult {
  // Clean up previous render
  cleanup();

  const container = document.createElement("div");
  container.setAttribute("data-whisq-test", "");
  document.body.appendChild(container);

  const dispose = mount(node, container);

  currentContainer = container;
  currentUnmount = () => {
    dispose();
    container.remove();
    currentContainer = null;
    currentUnmount = null;
  };

  return {
    container,
    unmount: currentUnmount,
  };
}

/**
 * Clean up the current render. Called automatically in afterEach if using vitest.
 */
export function cleanup(): void {
  if (currentUnmount) {
    currentUnmount();
  }
}

// ── waitFor ───────────────────────────────────────────────────────────────

export interface WaitForOptions {
  timeout?: number;
  interval?: number;
}

/**
 * Wait for a callback to stop throwing. Useful for async state updates.
 *
 * ```ts
 * await waitFor(() => expect(screen.getByText("Loaded")).toBeTruthy());
 * ```
 */
export async function waitFor<T>(
  callback: () => T,
  options?: WaitForOptions,
): Promise<T> {
  const timeout = options?.timeout ?? 1000;
  const interval = options?.interval ?? 50;
  const start = Date.now();

  while (true) {
    try {
      return callback();
    } catch (err) {
      if (Date.now() - start >= timeout) {
        throw err;
      }
      await new Promise((r) => setTimeout(r, interval));
    }
  }
}

// ── Helpers ───────────────────────────────────────────────────────────────

function getContainer(): HTMLElement {
  if (!currentContainer) {
    throw new Error(
      "[whisq/testing] No component rendered. Call render() first.",
    );
  }
  return currentContainer;
}

// Implicit role mapping for common elements
const IMPLICIT_ROLES: Record<string, string> = {
  BUTTON: "button",
  A: "link",
  INPUT: "textbox",
  TEXTAREA: "textbox",
  SELECT: "combobox",
  IMG: "img",
  TABLE: "table",
  FORM: "form",
  NAV: "navigation",
  MAIN: "main",
  HEADER: "banner",
  FOOTER: "contentinfo",
  ASIDE: "complementary",
  ARTICLE: "article",
  SECTION: "region",
  H1: "heading",
  H2: "heading",
  H3: "heading",
  H4: "heading",
  H5: "heading",
  H6: "heading",
  UL: "list",
  OL: "list",
  LI: "listitem",
};

function getImplicitRole(el: Element): string | null {
  const explicit = el.getAttribute("role");
  if (explicit) return explicit;

  if (el.tagName === "INPUT") {
    const type = (el as HTMLInputElement).type;
    if (type === "checkbox") return "checkbox";
    if (type === "radio") return "radio";
    if (type === "submit" || type === "button") return "button";
    if (type === "range") return "slider";
    return "textbox";
  }

  return IMPLICIT_ROLES[el.tagName] ?? null;
}

interface QueryOptions {
  exact?: boolean;
}

function textMatches(content: string, text: string, exact: boolean): boolean {
  return exact ? content === text : content.includes(text);
}

function findAllByTextInContainer(
  container: HTMLElement,
  text: string,
  exact: boolean,
): HTMLElement[] {
  const matches: HTMLElement[] = [];
  const all = container.querySelectorAll("*");
  for (const el of all) {
    const content = el.textContent ?? "";
    if (textMatches(content, text, exact)) {
      matches.push(el as HTMLElement);
    }
  }
  return matches;
}

function findAllByRoleInContainer(
  container: HTMLElement,
  role: string,
): HTMLElement[] {
  const matches: HTMLElement[] = [];
  const all = container.querySelectorAll("*");
  for (const el of all) {
    if (getImplicitRole(el) === role) {
      matches.push(el as HTMLElement);
    }
  }
  return matches;
}

// ── screen ─────────────────────────────────────────────────────────────────

/**
 * Query helpers for finding elements in the rendered output.
 * Mirrors a subset of @testing-library/dom's screen API.
 */
export const screen = {
  // ── getBy (throws if not found) ──────────────────────────────────────

  getByText(text: string, options?: QueryOptions): HTMLElement {
    const el = screen.queryByText(text, options);
    if (!el) {
      throw new Error(
        `[whisq/testing] Unable to find element with text: "${text}"`,
      );
    }
    return el;
  },

  getByRole(role: string): HTMLElement {
    const el = screen.queryByRole(role);
    if (!el) {
      throw new Error(
        `[whisq/testing] Unable to find element with role: "${role}"`,
      );
    }
    return el;
  },

  getByTestId(testId: string): HTMLElement {
    const el = screen.queryByTestId(testId);
    if (!el) {
      throw new Error(
        `[whisq/testing] Unable to find element with data-testid: "${testId}"`,
      );
    }
    return el;
  },

  getByLabelText(labelText: string): HTMLElement {
    const el = screen.queryByLabelText(labelText);
    if (!el) {
      throw new Error(
        `[whisq/testing] Unable to find element with label: "${labelText}"`,
      );
    }
    return el;
  },

  // ── queryBy (returns null if not found) ──────────────────────────────

  queryByText(text: string, options?: QueryOptions): HTMLElement | null {
    const container = getContainer();
    const exact = options?.exact !== false;
    const matches = findAllByTextInContainer(container, text, exact);
    return matches.length > 0 ? matches[matches.length - 1] : null;
  },

  queryByRole(role: string): HTMLElement | null {
    const container = getContainer();
    const all = container.querySelectorAll("*");
    for (const el of all) {
      if (getImplicitRole(el) === role) {
        return el as HTMLElement;
      }
    }
    return null;
  },

  queryByTestId(testId: string): HTMLElement | null {
    const container = getContainer();
    return container.querySelector(`[data-testid="${testId}"]`);
  },

  queryByLabelText(labelText: string): HTMLElement | null {
    const container = getContainer();

    // Check for <label> with matching text that has htmlFor
    const labels = container.querySelectorAll("label");
    for (const label of labels) {
      if ((label.textContent ?? "").trim() === labelText) {
        // Check for htmlFor pointing to an element
        if (label.htmlFor) {
          const target = container.querySelector(`#${label.htmlFor}`);
          if (target) return target as HTMLElement;
        }
        // Check for nested input inside label
        const nested = label.querySelector("input, textarea, select");
        if (nested) return nested as HTMLElement;
      }
    }

    // Check aria-label
    const ariaMatch = container.querySelector(`[aria-label="${labelText}"]`);
    if (ariaMatch) return ariaMatch as HTMLElement;

    return null;
  },

  // ── getAllBy (throws if none found) ──────────────────────────────────

  getAllByText(text: string, options?: QueryOptions): HTMLElement[] {
    const container = getContainer();
    const exact = options?.exact !== false;
    const matches = findAllByTextInContainer(container, text, exact);
    if (matches.length === 0) {
      throw new Error(
        `[whisq/testing] Unable to find any elements with text: "${text}"`,
      );
    }
    return matches;
  },

  getAllByRole(role: string): HTMLElement[] {
    const container = getContainer();
    const matches = findAllByRoleInContainer(container, role);
    if (matches.length === 0) {
      throw new Error(
        `[whisq/testing] Unable to find any elements with role: "${role}"`,
      );
    }
    return matches;
  },

  // ── queryAllBy (returns empty array) ────────────────────────────────

  queryAllByText(text: string, options?: QueryOptions): HTMLElement[] {
    const container = getContainer();
    const exact = options?.exact !== false;
    return findAllByTextInContainer(container, text, exact);
  },

  queryAllByRole(role: string): HTMLElement[] {
    const container = getContainer();
    return findAllByRoleInContainer(container, role);
  },

  // ── findBy (async — waits for element) ──────────────────────────────

  async findByText(
    text: string,
    options?: QueryOptions & WaitForOptions,
  ): Promise<HTMLElement> {
    return waitFor(() => screen.getByText(text, options), options);
  },

  async findByRole(
    role: string,
    options?: WaitForOptions,
  ): Promise<HTMLElement> {
    return waitFor(() => screen.getByRole(role), options);
  },

  async findByTestId(
    testId: string,
    options?: WaitForOptions,
  ): Promise<HTMLElement> {
    return waitFor(() => screen.getByTestId(testId), options);
  },
};

// ── fireEvent ──────────────────────────────────────────────────────────────

/**
 * Dispatch DOM events on elements for testing interactions.
 */
export const fireEvent = {
  click(el: Element): void {
    el.dispatchEvent(
      new MouseEvent("click", { bubbles: true, cancelable: true }),
    );
  },

  input(el: Element, init?: { target?: { value?: string } }): void {
    if (init?.target?.value !== undefined) {
      (el as HTMLInputElement).value = init.target.value;
    }
    el.dispatchEvent(new Event("input", { bubbles: true }));
  },

  change(el: Element, init?: { target?: { value?: string } }): void {
    if (init?.target?.value !== undefined) {
      (el as HTMLInputElement).value = init.target.value;
    }
    el.dispatchEvent(new Event("change", { bubbles: true }));
  },

  submit(el: Element): void {
    const form = el.closest("form") ?? el;
    form.dispatchEvent(
      new Event("submit", { bubbles: true, cancelable: true }),
    );
  },

  keydown(el: Element, init?: KeyboardEventInit): void {
    el.dispatchEvent(new KeyboardEvent("keydown", { bubbles: true, ...init }));
  },

  keyup(el: Element, init?: KeyboardEventInit): void {
    el.dispatchEvent(new KeyboardEvent("keyup", { bubbles: true, ...init }));
  },

  focus(el: Element): void {
    (el as HTMLElement).focus();
    el.dispatchEvent(new FocusEvent("focus", { bubbles: true }));
  },

  blur(el: Element): void {
    (el as HTMLElement).blur();
    el.dispatchEvent(new FocusEvent("blur", { bubbles: true }));
  },
};

// ── userEvent ──────────────────────────────────────────────────────────────

/**
 * Realistic user interaction simulation. Unlike fireEvent which dispatches
 * raw DOM events, userEvent simulates the full browser event sequence.
 */
export const userEvent = {
  /**
   * Simulate typing text into an input, firing keydown→input→keyup per character.
   */
  async type(el: Element, text: string): Promise<void> {
    (el as HTMLElement).focus();
    const input = el as HTMLInputElement;

    for (const char of text) {
      el.dispatchEvent(
        new KeyboardEvent("keydown", { key: char, bubbles: true }),
      );
      input.value += char;
      el.dispatchEvent(new Event("input", { bubbles: true }));
      el.dispatchEvent(
        new KeyboardEvent("keyup", { key: char, bubbles: true }),
      );
    }
  },

  /**
   * Clear an input field (select all + delete).
   */
  async clear(el: Element): Promise<void> {
    (el as HTMLElement).focus();
    const input = el as HTMLInputElement;
    input.value = "";
    el.dispatchEvent(new Event("input", { bubbles: true }));
  },

  /**
   * Click an element (mousedown → mouseup → click sequence).
   */
  async click(el: Element): Promise<void> {
    el.dispatchEvent(new MouseEvent("mousedown", { bubbles: true }));
    (el as HTMLElement).focus();
    el.dispatchEvent(new MouseEvent("mouseup", { bubbles: true }));
    el.dispatchEvent(
      new MouseEvent("click", { bubbles: true, cancelable: true }),
    );
  },

  /**
   * Press Tab to move focus to the next focusable element.
   */
  async tab(options?: { shift?: boolean }): Promise<void> {
    const active = document.activeElement ?? document.body;
    active.dispatchEvent(
      new KeyboardEvent("keydown", {
        key: "Tab",
        bubbles: true,
        shiftKey: options?.shift ?? false,
      }),
    );

    // Find all focusable elements in the container
    const container = getContainer();
    const focusable = Array.from(
      container.querySelectorAll<HTMLElement>(
        'a[href], button:not(:disabled), input:not(:disabled), textarea:not(:disabled), select:not(:disabled), [tabindex]:not([tabindex="-1"])',
      ),
    );

    if (focusable.length === 0) return;

    const currentIndex = focusable.indexOf(active as HTMLElement);
    const shift = options?.shift ?? false;
    let nextIndex: number;

    if (currentIndex === -1) {
      nextIndex = shift ? focusable.length - 1 : 0;
    } else {
      nextIndex = shift ? currentIndex - 1 : currentIndex + 1;
      if (nextIndex < 0) nextIndex = focusable.length - 1;
      if (nextIndex >= focusable.length) nextIndex = 0;
    }

    focusable[nextIndex].focus();
  },

  /**
   * Select an option in a <select> element by value.
   */
  async selectOptions(el: Element, values: string | string[]): Promise<void> {
    const select = el as HTMLSelectElement;
    const valueArr = Array.isArray(values) ? values : [values];

    for (const option of select.options) {
      option.selected = valueArr.includes(option.value);
    }

    el.dispatchEvent(new Event("change", { bubbles: true }));
  },
};
