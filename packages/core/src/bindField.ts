// ============================================================================
// Whisq Core — Field binding for items inside signal-held arrays
// bindField(source, item, key, opts?) covers the "field inside an item inside
// a keyed each()" shape that bind() doesn't reach. Sibling to bind() — same
// discriminator shapes (text/number/checkbox/radio); write produces an
// immutable array update on `source`.
// ============================================================================

import { type Signal, isSignal } from "./reactive.js";
import type { TextBind, NumberBind, CheckboxBind, RadioBind } from "./bind.js";
import { WhisqKeyByError } from "./dev-errors.js";

interface Common<T> {
  keyBy?: (item: T) => unknown;
  /**
   * Error on no-match writes instead of warning. Defaults to `true` in dev
   * (`process.env.NODE_ENV !== "production"`) and `false` in production, so
   * a stale accessor or broken `keyBy` surfaces as a `WhisqKeyByError` in
   * the dev loop but degrades to `console.warn` + discard in a shipped
   * build. Pass `strict: false` in tests that deliberately exercise the
   * no-match path, or `strict: true` in production if you want throws in
   * both environments.
   */
  strict?: boolean;
}

export type BindFieldOptions<T> =
  | Common<T>
  | ({ as: "number" } & Common<T>)
  | ({ as: "checkbox" } & Common<T>)
  | ({ as: "radio"; value: string } & Common<T>);

/**
 * Two-way binding for a field on an item inside a signal-held array.
 *
 * ```ts
 * each(() => todos.value, (todo) =>
 *   input({
 *     type: "checkbox",
 *     ...bindField(todos, todo, "done", { as: "checkbox" }),
 *   }),
 *   { key: (t) => t.id },
 * )
 * ```
 *
 * `keyBy` (default: `t => t.id`) identifies which item to rewrite. Writes
 * produce a new array so downstream `computed` / `effect` re-run correctly.
 */
export function bindField<T, K extends keyof T>(
  source: Signal<T[]>,
  item: () => T,
  key: K,
): TextBind;
export function bindField<T, K extends keyof T>(
  source: Signal<T[]>,
  item: () => T,
  key: K,
  options: { as: "number" } & Common<T>,
): NumberBind;
export function bindField<T, K extends keyof T>(
  source: Signal<T[]>,
  item: () => T,
  key: K,
  options: { as: "checkbox" } & Common<T>,
): CheckboxBind;
export function bindField<T, K extends keyof T, V extends string>(
  source: Signal<T[]>,
  item: () => T,
  key: K,
  options: { as: "radio"; value: V } & Common<T>,
): RadioBind<V>;
export function bindField<T, K extends keyof T>(
  source: Signal<T[]>,
  item: () => T,
  key: K,
  options?: Common<T>,
): TextBind;
export function bindField<T, K extends keyof T>(
  source: Signal<T[]>,
  item: () => T,
  key: K,
  options?: BindFieldOptions<T>,
): TextBind | NumberBind | CheckboxBind | RadioBind<string> {
  if (!isSignal(source)) throw new TypeError("bindField: source must be Signal");
  if (typeof item !== "function")
    throw new TypeError("bindField: item must be a function");

  const keyBy =
    (options as Common<T>)?.keyBy ??
    ((t: T) => (t as { id?: unknown }).id);

  const strictOpt = (options as Common<T>)?.strict;

  const write = (next: T[K]): void => {
    const target = keyBy(item());
    let matched = false;
    const arr = source.value.map((t) => {
      if (keyBy(t) === target) {
        matched = true;
        return { ...t, [key]: next };
      }
      return t;
    });
    if (!matched) {
      const strict =
        strictOpt ?? process.env.NODE_ENV !== "production";
      if (strict) {
        throw new WhisqKeyByError({
          sourceKeys: source.value.map((t) => keyBy(t)),
          targetKey: target,
          field: String(key),
        });
      }
      // eslint-disable-next-line no-console
      console.warn(
        `bindField: no item in source matched ${String(target)}; write to "${String(key)}" discarded.`,
      );
      return;
    }
    source.value = arr;
  };

  const as = (options as { as?: string } | undefined)?.as;

  if (as === "checkbox") {
    return {
      checked: () => item()[key] as unknown as boolean,
      onchange: (e) => write(
        (e.target as HTMLInputElement).checked as unknown as T[K],
      ),
    };
  }

  if (as === "radio") {
    const target = (options as { value: string }).value;
    return {
      value: target,
      checked: () => (item()[key] as unknown) === target,
      onchange: (e) => {
        if ((e.target as HTMLInputElement).checked)
          write(target as unknown as T[K]);
      },
    };
  }

  if (as === "number") {
    return {
      value: () => String(item()[key] as unknown),
      oninput: (e) => {
        const n = (e.target as HTMLInputElement).valueAsNumber;
        if (!Number.isNaN(n)) write(n as unknown as T[K]);
      },
    };
  }

  return {
    value: () => String(item()[key] as unknown),
    oninput: (e) =>
      write(
        (e.target as HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement)
          .value as unknown as T[K],
      ),
  };
}
