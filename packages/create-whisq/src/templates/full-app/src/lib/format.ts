// Pure utilities. NO Whisq imports — `lib/` modules stay testable in
// isolation. If a helper needs a signal, it belongs in `stores/` instead.

/**
 * Format a count as a human-readable string. Uses locale-aware grouping so
 * 1234 renders as "1,234" in en-US, "1.234" in de-DE, etc.
 */
export function formatCount(n: number): string {
  return n.toLocaleString();
}

/**
 * Clamp a number between a min and a max. Useful for bounding user input
 * before handing it to a signal write.
 */
export function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max);
}
