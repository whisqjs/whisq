// ============================================================================
// Whisq Core — DOM element ref
// Signal-based and callback-based refs for imperative DOM access.
// ============================================================================

import { signal, type Signal } from "./reactive.js";

/**
 * A ref accepts either a Signal that will be populated with the element,
 * or a callback invoked with the element (and later with null on unmount).
 */
export type Ref<T extends HTMLElement = HTMLElement> =
  | Signal<T | null>
  | ((el: T | null) => void);

/**
 * Create a typed signal ref for a DOM element.
 *
 * The signal starts at `null` and is populated with the element after mount;
 * it is reset to `null` on unmount.
 *
 * ```ts
 * const inputEl = ref<HTMLInputElement>();
 * input({ ref: inputEl });
 * onMount(() => inputEl.value?.focus());
 * ```
 */
export function ref<T extends HTMLElement = HTMLElement>(): Signal<T | null> {
  return signal<T | null>(null);
}
