// ============================================================================
// Whisq Core — Styling System
//
// Three levels, all functions, no tagged templates:
//
//   sheet()   → Scoped CSS classes from JS objects (like CSS Modules, no build)
//   styles()  → Reactive inline styles from JS objects
//   cx()      → Class name composition helper
//
// AI generates JS objects better than CSS strings.
// ============================================================================

// ── sheet() — Scoped CSS-in-JS ──────────────────────────────────────────────

type StyleValue = string | number;
type StyleRule = Record<string, StyleValue>;
type NestedRule = StyleRule & {
  [key: `&${string}`]: StyleRule; // &:hover, &:focus, &::before, &.active
  [key: `@${string}`]: StyleRule; // @media queries
};

type SheetDef = Record<string, NestedRule | StyleRule>;
type SheetResult<T extends SheetDef> = {
  [K in keyof T]: string; // class name per key
} & {
  /** Get raw scoped class name */
  cls(
    name: keyof T,
    ...conditionals: (keyof T | false | null | undefined)[]
  ): string;
};

let sheetCounter = 0;

/**
 * Create scoped CSS classes from JavaScript objects.
 * Returns an object where each key is a scoped class name.
 * Auto-injects a <style> tag into the document.
 *
 * ```ts
 * const s = sheet({
 *   card: {
 *     padding: "1.5rem",
 *     borderRadius: "12px",
 *     background: "#fff",
 *     boxShadow: "0 2px 8px rgba(0,0,0,0.1)",
 *     "&:hover": {
 *       background: "#f5f5f5",
 *     },
 *   },
 *   title: {
 *     fontSize: "1.25rem",
 *     fontWeight: 600,
 *     color: "#111",
 *   },
 *   subtitle: {
 *     fontSize: "0.875rem",
 *     color: "#666",
 *   },
 * });
 *
 * // Use in elements:
 * div({ class: s.card },
 *   h2({ class: s.title }, "Hello"),
 *   p({ class: s.subtitle }, "World"),
 * )
 * ```
 */
export function sheet<T extends SheetDef>(definitions: T): SheetResult<T> {
  const id = `wq${sheetCounter++}`;
  const classMap: Record<string, string> = {};
  let cssText = "";

  for (const [name, rules] of Object.entries(definitions)) {
    const scopedClass = `${id}_${name}`;
    classMap[name] = scopedClass;

    const { base, nested } = splitRules(rules as Record<string, any>);

    // Base rule
    if (Object.keys(base).length > 0) {
      cssText += `.${scopedClass}{${objectToCSS(base)}}`;
    }

    // Nested rules (&:hover, &.active, @media, etc.)
    for (const [selector, nestedRules] of Object.entries(nested)) {
      if (selector.startsWith("&")) {
        // Pseudo-class / modifier: &:hover, &::before, &.active
        const suffix = selector.slice(1);
        cssText += `.${scopedClass}${suffix}{${objectToCSS(nestedRules)}}`;
      } else if (selector.startsWith("@")) {
        // Media query
        cssText += `${selector}{.${scopedClass}{${objectToCSS(nestedRules)}}}`;
      }
    }
  }

  // Inject stylesheet
  injectCSS(id, cssText);

  // Build result object with class names and cls() helper
  const result = Object.assign({} as { [K in keyof T]: string }, classMap, {
    cls(
      name: keyof T,
      ...conditionals: (keyof T | false | null | undefined)[]
    ) {
      const classes = [classMap[name as string]];
      for (const c of conditionals) {
        if (c && classMap[c as string]) {
          classes.push(classMap[c as string]);
        }
      }
      return classes.join(" ");
    },
  });

  return result as SheetResult<T>;
}

// ── styles() — Reactive Inline Styles ───────────────────────────────────────

type ReactiveStyleValue = StyleValue | (() => StyleValue | undefined);
type ReactiveStyleDef = Record<string, ReactiveStyleValue>;

/**
 * Create a reactive inline style string from a JS object.
 * Static values render once. Function values update reactively.
 *
 * ```ts
 * div({
 *   style: styles({
 *     padding: "1rem",                          // static
 *     background: () => dark.value ? "#111" : "#fff", // reactive
 *     color: () => dark.value ? "#fff" : "#111",      // reactive
 *     transform: () => `scale(${scale.value})`,       // reactive
 *   }),
 * }, "Content")
 * ```
 */
export function styles(def: ReactiveStyleDef): string | (() => string) {
  const staticParts: string[] = [];
  const reactiveParts: { prop: string; fn: () => StyleValue | undefined }[] =
    [];

  for (const [prop, value] of Object.entries(def)) {
    const cssProp = camelToKebab(prop);
    if (typeof value === "function") {
      reactiveParts.push({
        prop: cssProp,
        fn: value as () => StyleValue | undefined,
      });
    } else {
      staticParts.push(`${cssProp}:${value}`);
    }
  }

  if (reactiveParts.length === 0) {
    // Fully static — return string directly
    return staticParts.join(";");
  }

  // Has reactive parts — return a getter function
  return () => {
    const parts = [...staticParts];
    for (const { prop, fn } of reactiveParts) {
      const val = fn();
      if (val !== undefined) {
        parts.push(`${prop}:${val}`);
      }
    }
    return parts.join(";");
  };
}

// ── cx() — Class Name Composition ───────────────────────────────────────────

type ClassValue =
  | string
  | false
  | null
  | undefined
  | 0
  | Record<string, boolean | (() => boolean)>;

/**
 * Compose class names conditionally. Static version.
 *
 * ```ts
 * div({ class: cx("btn", isPrimary && "btn-primary", isLarge && "btn-lg") })
 * div({ class: cx("card", { active: true, disabled: false }) })
 * ```
 */
export function cx(...args: ClassValue[]): string {
  const classes: string[] = [];

  for (const arg of args) {
    if (!arg) continue;
    if (typeof arg === "string") {
      classes.push(arg);
    } else if (typeof arg === "object") {
      for (const [key, val] of Object.entries(arg)) {
        const active = typeof val === "function" ? val() : val;
        if (active) classes.push(key);
      }
    }
  }

  return classes.join(" ");
}

/**
 * Reactive class name composition. Returns a getter function.
 *
 * ```ts
 * div({
 *   class: rcx(
 *     "btn",
 *     () => variant.value === "primary" && "btn-primary",
 *     () => loading.value && "btn-loading",
 *   ),
 * })
 * ```
 */
export function rcx(
  ...args: (
    | string
    | (() => string | false | null | undefined)
    | false
    | null
    | undefined
  )[]
): () => string {
  return () => {
    const classes: string[] = [];
    for (const arg of args) {
      if (!arg) continue;
      if (typeof arg === "string") {
        classes.push(arg);
      } else if (typeof arg === "function") {
        const result = arg();
        if (result) classes.push(result);
      }
    }
    return classes.join(" ");
  };
}

// ── theme() — Design Tokens ────────────────────────────────────────────────

type ThemeTokens = Record<
  string,
  string | number | Record<string, string | number>
>;

/**
 * Define CSS custom properties (design tokens) at :root level.
 *
 * ```ts
 * theme({
 *   color: {
 *     primary: "#4386FB",
 *     secondary: "#2EC4B6",
 *     text: "#111827",
 *     muted: "#6B7280",
 *     bg: "#ffffff",
 *   },
 *   space: {
 *     xs: "0.25rem",
 *     sm: "0.5rem",
 *     md: "1rem",
 *     lg: "1.5rem",
 *     xl: "2rem",
 *   },
 *   radius: {
 *     sm: "4px",
 *     md: "8px",
 *     lg: "12px",
 *     full: "9999px",
 *   },
 *   font: {
 *     sans: "system-ui, -apple-system, sans-serif",
 *     mono: "ui-monospace, monospace",
 *   },
 * });
 *
 * // Generated CSS variables:
 * // --color-primary: #4386FB;
 * // --space-md: 1rem;
 * // --radius-lg: 12px;
 *
 * // Use in sheet():
 * sheet({
 *   card: {
 *     background: "var(--color-bg)",
 *     padding: "var(--space-lg)",
 *     borderRadius: "var(--radius-lg)",
 *     fontFamily: "var(--font-sans)",
 *   }
 * })
 * ```
 */
export function theme(tokens: ThemeTokens): void {
  let cssText = ":root{";

  for (const [group, value] of Object.entries(tokens)) {
    if (typeof value === "object") {
      for (const [key, val] of Object.entries(value)) {
        cssText += `--${group}-${key}:${val};`;
      }
    } else {
      cssText += `--${group}:${value};`;
    }
  }

  cssText += "}";
  injectCSS("whisq-theme", cssText);
}

// ── Internal ────────────────────────────────────────────────────────────────

function objectToCSS(obj: Record<string, string | number>): string {
  let css = "";
  for (const [prop, value] of Object.entries(obj)) {
    css += `${camelToKebab(prop)}:${value};`;
  }
  return css;
}

function camelToKebab(str: string): string {
  return str.replace(/[A-Z]/g, (m) => `-${m.toLowerCase()}`);
}

function splitRules(rules: Record<string, any>): {
  base: Record<string, string | number>;
  nested: Record<string, Record<string, string | number>>;
} {
  const base: Record<string, string | number> = {};
  const nested: Record<string, Record<string, string | number>> = {};

  for (const [key, value] of Object.entries(rules)) {
    if (key.startsWith("&") || key.startsWith("@")) {
      nested[key] = value;
    } else {
      base[key] = value;
    }
  }

  return { base, nested };
}

function injectCSS(id: string, cssText: string): void {
  // Remove existing style with same id
  const existing = document.getElementById(`whisq-style-${id}`);
  if (existing) existing.remove();

  const style = document.createElement("style");
  style.id = `whisq-style-${id}`;
  style.textContent = cssText;
  document.head.appendChild(style);
}
