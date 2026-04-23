// ============================================================================
// Whisq Core — Two-way input binding helper
// bind(signal, options?) returns a prop object to spread into input/select/textarea.
// ============================================================================

import { type Signal, isSignal } from "./reactive.js";
import { tagBindResult } from "./bind-sentinel.js";

export interface TextBind {
  value: () => string;
  oninput: (e: Event) => void;
}

export interface NumberBind {
  value: () => string;
  oninput: (e: Event) => void;
}

export interface CheckboxBind {
  checked: () => boolean;
  onchange: (e: Event) => void;
}

export interface RadioBind<V extends string> {
  value: V;
  checked: () => boolean;
  onchange: (e: Event) => void;
}

export type BindOptions =
  | { as: "number" }
  | { as: "checkbox" }
  | { as: "radio"; value: string };

/**
 * Two-way binding helper for form inputs.
 *
 * ```ts
 * input({ ...bind(name) })                              // text
 * input({ type: "number", ...bind(age, { as: "number" }) })
 * input({ type: "checkbox", ...bind(agreed, { as: "checkbox" }) })
 * input({ type: "radio", ...bind(role, { as: "radio", value: "admin" }) })
 * ```
 */
export function bind(signal: Signal<string>): TextBind;
export function bind(
  signal: Signal<number>,
  options: { as: "number" },
): NumberBind;
export function bind(
  signal: Signal<boolean>,
  options: { as: "checkbox" },
): CheckboxBind;
export function bind<V extends string>(
  signal: Signal<V>,
  options: { as: "radio"; value: V },
): RadioBind<V>;
export function bind(
  signal: Signal<string | number | boolean>,
  options?: BindOptions,
): TextBind | NumberBind | CheckboxBind | RadioBind<string> {
  if (!isSignal(signal)) {
    throw new TypeError("bind() expects a Signal as its first argument");
  }

  if (options?.as === "checkbox") {
    const sig = signal as Signal<boolean>;
    return tagBindResult({
      checked: () => sig.value,
      onchange: (e: Event) => {
        sig.value = (e.target as HTMLInputElement).checked;
      },
    });
  }

  if (options?.as === "radio") {
    const sig = signal as Signal<string>;
    const target = options.value;
    return tagBindResult({
      value: target,
      checked: () => sig.value === target,
      onchange: (e: Event) => {
        if ((e.target as HTMLInputElement).checked) {
          sig.value = target;
        }
      },
    });
  }

  if (options?.as === "number") {
    const sig = signal as Signal<number>;
    return tagBindResult({
      value: () => String(sig.value),
      oninput: (e: Event) => {
        const n = (e.target as HTMLInputElement).valueAsNumber;
        if (!Number.isNaN(n)) sig.value = n;
      },
    });
  }

  const sig = signal as Signal<string>;
  return tagBindResult({
    value: () => sig.value,
    oninput: (e: Event) => {
      sig.value = (
        e.target as HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement
      ).value;
    },
  });
}
