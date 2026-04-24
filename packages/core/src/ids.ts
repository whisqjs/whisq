// ============================================================================
// Whisq Core — IDs
//
// randomId() — UUID-v4-shaped string. Uses `crypto.randomUUID()` when
// available (all modern browsers, Node 19+). Falls back to a Math.random
// synthesis for older targets (old Safari, old Node) where the native API
// isn't exposed. The fallback is NOT cryptographically strong — suitable
// for client-side row ids / keys, not for security tokens.
//
// Import path: `@whisq/core/ids` — kept off the top-level bundle so apps
// that don't use it pay no size cost.
// ============================================================================

/**
 * Options for {@link randomId}.
 *
 * Both fields are optional; omitting both preserves the zero-arg behaviour.
 */
export interface RandomIdOptions {
  /**
   * String prepended to the UUID. No separator is inserted — pass
   * `"todo_"` or `"item-"` if you want one. Handy for making `each({ key })`
   * values self-describing (e.g. `todo_01K1…`).
   */
  prefix?: string;
  /**
   * Override the source of randomness. When supplied, `crypto.randomUUID()`
   * is bypassed entirely and the fallback synthesis runs with this function
   * in place of `Math.random`. The primary use-case is **deterministic ids
   * for snapshot tests**: pass a seeded PRNG to get reproducible output.
   *
   * The function must return a value in `[0, 1)` (same contract as
   * `Math.random`). A degenerate `() => 0` returns an all-zero UUID.
   */
  rng?: () => number;
}

/**
 * Generate a UUID-v4-shaped random identifier.
 *
 * ```ts
 * import { randomId } from "@whisq/core/ids";
 *
 * const todo = { id: randomId(), text, done: false };
 * const scoped = randomId({ prefix: "todo_" });      // "todo_01K1..."
 * const seeded = randomId({ rng: seedrandom(42) });  // deterministic
 * ```
 *
 * Without options, prefers `crypto.randomUUID()` when the platform provides
 * it (all modern browsers; Node 19+; Deno; Bun). Otherwise falls back to a
 * `Math.random` synthesis — same v4 shape (`xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx`
 * where `y ∈ {8, 9, a, b}`), but with weaker entropy. Good enough for UI row
 * ids and keyed-`each` keys; not for tokens, secrets, or deduplication
 * across independent clients.
 *
 * When `options.rng` is supplied, the native path is skipped regardless of
 * platform so the same code yields the same id in every environment — the
 * point is testability, not randomness.
 */
export function randomId(options?: RandomIdOptions): string {
  const prefix = options?.prefix ?? "";
  const rng = options?.rng;

  if (rng) {
    return prefix + fallbackUuid(rng);
  }

  if (
    typeof crypto !== "undefined" &&
    typeof crypto.randomUUID === "function"
  ) {
    return prefix + crypto.randomUUID();
  }
  return prefix + fallbackUuid();
}

function fallbackUuid(rng: () => number = Math.random): string {
  // Compose 32 hex digits, then splice in the v4 version (4) and variant
  // (8/9/a/b) bits at positions 12 and 16. Output shape matches RFC 4122 v4.
  const hex = (digits: number): string => {
    let out = "";
    for (let i = 0; i < digits; i++) {
      out += Math.floor(rng() * 16).toString(16);
    }
    return out;
  };
  const variant = ((rng() * 4) | 0) + 8; // 8..11 → 8,9,a,b
  return `${hex(8)}-${hex(4)}-4${hex(3)}-${variant.toString(16)}${hex(3)}-${hex(12)}`;
}
