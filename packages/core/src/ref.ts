// ============================================================================
// Whisq Core — DOM element ref
// Signal-based and callback-based refs for imperative DOM access.
// ============================================================================

import { signal, type Signal } from "./reactive.js";

/**
 * A ref target accepts either a signal that will be populated with the
 * element, or a callback invoked with the element (and later with `null`
 * on unmount). Passed to the `ref` prop on any element.
 *
 * Use `ref<T>()` to create the signal variant; the callback variant is an
 * inline `(el) => void` arrow.
 */
export type Ref<T extends HTMLElement = HTMLElement> =
  | Signal<T | null>
  | ((el: T | null) => void);

/**
 * A ref to a DOM element, created by `ref<T>()`. It is a regular Whisq
 * `Signal<T | null>` — **read it with `.value`, not `.current`**. The
 * framework populates it after the element mounts and resets it to `null`
 * on unmount. Use `.peek()` for a non-tracking read, `.subscribe()` to
 * observe changes without an `effect()`, and write to `.value` is
 * allowed but rarely useful (the framework overwrites it on mount).
 *
 * Equivalent to `Signal<T | null>`; the named alias exists so editor
 * tooltips on a `ref()` return surface read "`ElementRef<HTMLInputElement>`"
 * rather than the raw signal type.
 */
export type ElementRef<T extends HTMLElement = HTMLElement> = Signal<T | null>;

/**
 * Create an element ref for imperative DOM access.
 *
 * Returns an `ElementRef<T>` — a regular signal whose `.value` is `null`
 * until the element mounts, and returns to `null` after unmount. Read with
 * `.value` like any signal. `currentTarget`-style `.current` is **not** the
 * Whisq idiom.
 *
 * ```ts
 * const inputEl = ref<HTMLInputElement>();
 *
 * input({ ref: inputEl, type: "text" });
 *
 * // Imperative, on next microtask after mount:
 * onMount(() => inputEl.value?.focus());
 *
 * // Reactive, in a getter:
 * div({ hidden: () => inputEl.value == null }, "loading...")
 * ```
 */
export function ref<T extends HTMLElement = HTMLElement>(): ElementRef<T> {
  return signal<T | null>(null);
}
