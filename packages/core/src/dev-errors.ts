// ============================================================================
// Whisq Core — Developer-friendly structural error
// Thrown by dev-mode validators on malformed children / structure. Guarded by
// `process.env.NODE_ENV !== "production"` at call sites so prod bundlers
// tree-shake the validation code away.
// ============================================================================


export interface WhisqStructureErrorFields {
  /** What the framework expected at this position. */
  expected: string;
  /** What it actually received — human-readable. */
  received: string;
  /** Element or API surface where the mismatch happened (e.g. "div", "each", "component"). */
  element: string;
  /** Short "how to fix" hint for the most common cause. */
  hint?: string;
  /** Optional call-site info (file:line). Not yet populated; reserved. */
  callsite?: string;
}

/**
 * Thrown in dev mode when a Whisq API receives a value it can't render.
 * Catch this to turn framework-level "structural" bugs into friendly UI.
 * Production builds strip the throw sites — this class exists at runtime
 * but is never instantiated outside of development / test.
 */
export class WhisqStructureError extends Error {
  readonly expected: string;
  readonly received: string;
  readonly element: string;
  readonly hint?: string;
  readonly callsite?: string;

  constructor(fields: WhisqStructureErrorFields) {
    const parts = [
      `${fields.element}: expected ${fields.expected}, received ${fields.received}.`,
    ];
    if (fields.hint) parts.push(`Hint: ${fields.hint}`);
    if (fields.callsite) parts.push(`At: ${fields.callsite}`);
    super(parts.join(" "));
    this.name = "WhisqStructureError";
    this.expected = fields.expected;
    this.received = fields.received;
    this.element = fields.element;
    this.hint = fields.hint;
    this.callsite = fields.callsite;
  }
}

/**
 * Short human description of any value — used for the `received` field of a
 * structure error. Deliberately terse so the composed message stays short.
 */
export function describeValue(value: unknown): string {
  if (value === null) return "null";
  if (value === undefined) return "undefined";
  if (Array.isArray(value)) return `array (length ${value.length})`;
  const t = typeof value;
  if (t === "string") return `string ${JSON.stringify((value as string).slice(0, 40))}`;
  if (t === "number" || t === "boolean" || t === "bigint") return `${t} ${String(value)}`;
  if (t === "function") return "function";
  if (t === "symbol") return "symbol";
  if (t === "object") {
    const ctor = (value as object).constructor?.name;
    return ctor && ctor !== "Object" ? `${ctor} instance` : "plain object";
  }
  return t;
}
