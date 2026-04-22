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
 * Generate a UUID-v4-shaped random identifier.
 *
 * ```ts
 * import { randomId } from "@whisq/core/ids";
 *
 * const todo = { id: randomId(), text, done: false };
 * ```
 *
 * Prefers `crypto.randomUUID()` when the platform provides it (all modern
 * browsers; Node 19+; Deno; Bun). Otherwise falls back to a `Math.random`
 * synthesis — same v4 shape (`xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx` where
 * `y ∈ {8, 9, a, b}`), but with weaker entropy. Good enough for UI row
 * ids and keyed-`each` keys; not for tokens, secrets, or deduplication
 * across independent clients.
 */
export function randomId(): string {
  if (
    typeof crypto !== "undefined" &&
    typeof crypto.randomUUID === "function"
  ) {
    return crypto.randomUUID();
  }
  return fallbackUuid();
}

function fallbackUuid(): string {
  // Compose 32 hex digits, then splice in the v4 version (4) and variant
  // (8/9/a/b) bits at positions 12 and 16. Output shape matches RFC 4122 v4.
  const hex = (digits: number): string => {
    let out = "";
    for (let i = 0; i < digits; i++) {
      out += Math.floor(Math.random() * 16).toString(16);
    }
    return out;
  };
  const variant = ((Math.random() * 4) | 0) + 8; // 8..11 → 8,9,a,b
  return `${hex(8)}-${hex(4)}-4${hex(3)}-${variant.toString(16)}${hex(3)}-${hex(12)}`;
}
