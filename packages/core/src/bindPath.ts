// ============================================================================
// Whisq Core — Deep-path field binding for nested records
// bindPath(source, path, opts?) covers the "nested object field" case that
// bind() / bindField() don't reach. Use for forms on records with nested
// shape (user.profile.email, settings.theme.mode, ...). Array traversal is
// NOT supported in the path — reach for bindField() at the array level.
// ============================================================================

import { type Signal, isSignal } from "./reactive.js";
import type { TextBind, NumberBind, CheckboxBind, RadioBind } from "./bind.js";

type PathOptions =
  | Record<string, never>
  | { as: "number" }
  | { as: "checkbox" }
  | { as: "radio"; value: string };

// Typed overloads for common depths. Deeper paths fall back to the loose
// signature — TypeScript gives up on full path inference past ~4 levels
// anyway, and a reasonable cast at the call site is clearer than the noise
// a deeper typed path would add.

type Path1<T, K1 extends keyof T> = readonly [K1];
type Path2<T, K1 extends keyof T, K2 extends keyof T[K1]> = readonly [K1, K2];
type Path3<
  T,
  K1 extends keyof T,
  K2 extends keyof T[K1],
  K3 extends keyof T[K1][K2],
> = readonly [K1, K2, K3];
type Path4<
  T,
  K1 extends keyof T,
  K2 extends keyof T[K1],
  K3 extends keyof T[K1][K2],
  K4 extends keyof T[K1][K2][K3],
> = readonly [K1, K2, K3, K4];

function readPath(obj: unknown, path: readonly PropertyKey[]): unknown {
  let cur: unknown = obj;
  for (const k of path) {
    if (cur == null || typeof cur !== "object") return undefined;
    cur = (cur as Record<PropertyKey, unknown>)[k];
  }
  return cur;
}

function writePath(
  obj: unknown,
  path: readonly PropertyKey[],
  value: unknown,
): unknown {
  if (path.length === 0) return value;
  const [head, ...rest] = path;
  const current =
    obj != null && typeof obj === "object"
      ? (obj as Record<PropertyKey, unknown>)
      : {};
  return { ...current, [head]: writePath(current[head], rest, value) };
}

/**
 * Two-way binding for a field at an arbitrary **object path** in a
 * signal-held record. Use when `bind()` doesn't apply because the field
 * lives two or more levels deep:
 *
 * ```ts
 * const user = signal<User>({ id: "u1", profile: { name: "", email: "" } });
 *
 * form(
 *   input({ ...bindPath(user, ["profile", "name"]) }),
 *   input({ type: "email", ...bindPath(user, ["profile", "email"]) }),
 *   input({ type: "checkbox",
 *     ...bindPath(user, ["prefs", "dark"], { as: "checkbox" }) }),
 * );
 * ```
 *
 * Writes produce a new root — every level on the path gets a shallow spread,
 * sibling branches preserve referential identity so downstream `computed` /
 * `effect` re-runs stay narrow.
 *
 * ### Not in scope
 *
 * - **Array traversal**: `["items", 0, "done"]` is not supported. Arrays use
 *   positional semantics but the framework already has `bindField()` for
 *   "field on an item inside a signal-held array" — use that at the array
 *   level and `bindPath` for nested-object-only paths.
 * - **Auto-creating intermediate levels** that are missing: reading through
 *   a missing parent returns `undefined`; writing through creates objects
 *   as needed. If the intermediate existed but was `null`, you'll clobber
 *   the null with an object on write — intentional, but worth knowing.
 */
export function bindPath<T, K1 extends keyof T>(
  source: Signal<T>,
  path: Path1<T, K1>,
): T[K1] extends string ? TextBind : never;
export function bindPath<T, K1 extends keyof T, K2 extends keyof T[K1]>(
  source: Signal<T>,
  path: Path2<T, K1, K2>,
): T[K1][K2] extends string ? TextBind : never;
export function bindPath<
  T,
  K1 extends keyof T,
  K2 extends keyof T[K1],
  K3 extends keyof T[K1][K2],
>(
  source: Signal<T>,
  path: Path3<T, K1, K2, K3>,
): T[K1][K2][K3] extends string ? TextBind : never;
export function bindPath<
  T,
  K1 extends keyof T,
  K2 extends keyof T[K1],
  K3 extends keyof T[K1][K2],
  K4 extends keyof T[K1][K2][K3],
>(
  source: Signal<T>,
  path: Path4<T, K1, K2, K3, K4>,
): T[K1][K2][K3][K4] extends string ? TextBind : never;
export function bindPath<T>(
  source: Signal<T>,
  path: readonly PropertyKey[],
  options: { as: "number" },
): NumberBind;
export function bindPath<T>(
  source: Signal<T>,
  path: readonly PropertyKey[],
  options: { as: "checkbox" },
): CheckboxBind;
export function bindPath<T, V extends string>(
  source: Signal<T>,
  path: readonly PropertyKey[],
  options: { as: "radio"; value: V },
): RadioBind<V>;
export function bindPath<T>(
  source: Signal<T>,
  path: readonly PropertyKey[],
  options?: PathOptions,
): TextBind;
export function bindPath<T>(
  source: Signal<T>,
  path: readonly PropertyKey[],
  options?: PathOptions,
): TextBind | NumberBind | CheckboxBind | RadioBind<string> {
  if (!isSignal(source)) {
    throw new TypeError("bindPath: source must be a Signal");
  }
  if (!Array.isArray(path) || path.length === 0) {
    throw new TypeError("bindPath: path must be a non-empty array of keys");
  }

  const write = (next: unknown): void => {
    source.value = writePath(source.value, path, next) as T;
  };

  const as = (options as { as?: string } | undefined)?.as;

  if (as === "checkbox") {
    return {
      checked: () => readPath(source.value, path) as boolean,
      onchange: (e) =>
        write((e.target as HTMLInputElement).checked),
    };
  }

  if (as === "radio") {
    const target = (options as { value: string }).value;
    return {
      value: target,
      checked: () => readPath(source.value, path) === target,
      onchange: (e) => {
        if ((e.target as HTMLInputElement).checked) write(target);
      },
    };
  }

  if (as === "number") {
    return {
      value: () => String(readPath(source.value, path) ?? ""),
      oninput: (e) => {
        const n = (e.target as HTMLInputElement).valueAsNumber;
        if (!Number.isNaN(n)) write(n);
      },
    };
  }

  return {
    value: () => String(readPath(source.value, path) ?? ""),
    oninput: (e) =>
      write(
        (e.target as HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement)
          .value,
      ),
  };
}
