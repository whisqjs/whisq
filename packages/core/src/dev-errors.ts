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

export interface WhisqKeyByErrorFields {
  /** All keys present in the source array at write time, in source order. */
  sourceKeys: unknown[];
  /** The key the write was trying to match against. */
  targetKey: unknown;
  /** The field name being written (from bindField's `key` argument). */
  field: string;
}

/**
 * Thrown by `bindField()` in dev mode (or with `strict: true`) when a write
 * can't find an item in the source array whose `keyBy(...)` matches the
 * current accessor's key. The typical cause is a stale accessor (the item
 * was removed from the source after the accessor was created) or a broken
 * `keyBy` function (returns a different key for read vs write).
 *
 * Production builds without `strict: true` log a warning and discard the
 * write instead of throwing.
 */
export class WhisqKeyByError extends Error {
  readonly sourceKeys: unknown[];
  readonly targetKey: unknown;
  readonly field: string;

  constructor(fields: WhisqKeyByErrorFields) {
    super(
      `bindField: no item in source matched ${String(fields.targetKey)}; write to "${fields.field}" discarded. Source keys at write time: [${fields.sourceKeys.map(String).join(", ")}].`,
    );
    this.name = "WhisqKeyByError";
    this.sourceKeys = fields.sourceKeys;
    this.targetKey = fields.targetKey;
    this.field = fields.field;
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
