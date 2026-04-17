/**
 * Validate Whisq code for common errors and anti-patterns.
 */

export interface ValidationIssue {
  line: number;
  message: string;
  severity: "error" | "warning";
}

export interface ValidationResult {
  valid: boolean;
  issues: ValidationIssue[];
}

interface Rule {
  pattern: RegExp;
  message: string;
  severity: "error" | "warning";
}

const RULES: Rule[] = [
  // ── Reactivity errors ───────────────────────────────────────────────
  {
    pattern:
      /(?:div|span|p|h[1-6]|button|li|td|th|label)\(\s*\w+\.value\s*[,\)]/,
    message: "Bare .value as child — wrap in a function: () => count.value",
    severity: "error",
  },
  {
    pattern: /\.value\.push\s*\(/,
    message:
      "Mutating signal array with .push() won't trigger updates. Use: items.value = [...items.value, newItem]",
    severity: "error",
  },
  {
    pattern: /\.value\.splice\s*\(/,
    message:
      "Mutating signal array with .splice() won't trigger updates. Create a new array instead.",
    severity: "error",
  },
  {
    pattern: /\.value\.pop\s*\(\)/,
    message:
      "Mutating signal array with .pop() won't trigger updates. Use: items.value = items.value.slice(0, -1)",
    severity: "error",
  },
  {
    pattern: /\.value\.shift\s*\(\)/,
    message:
      "Mutating signal array with .shift() won't trigger updates. Use: items.value = items.value.slice(1)",
    severity: "error",
  },
  {
    pattern: /\.value\.sort\s*\(/,
    message:
      "Mutating signal array with .sort() won't trigger updates. Use: items.value = [...items.value].sort(...)",
    severity: "error",
  },
  {
    pattern: /\.value\.reverse\s*\(\)/,
    message:
      "Mutating signal array with .reverse() won't trigger updates. Use: items.value = [...items.value].reverse()",
    severity: "error",
  },

  // ── Syntax / framework errors ───────────────────────────────────────
  {
    pattern: /<[A-Z][a-zA-Z]*[\s/>]/,
    message:
      "JSX syntax detected — Whisq uses function calls, not JSX: div(), span(), Component({})",
    severity: "error",
  },
  {
    pattern: /on\w+\s*=\s*["']/,
    message:
      "String event handler detected — use functions: onclick: () => ...",
    severity: "error",
  },
  {
    pattern: /class\s+\w+\s+extends\s+(Component|React)/,
    message:
      "Whisq uses function components via component(), not class components.",
    severity: "error",
  },

  // ── Warnings ────────────────────────────────────────────────────────
  {
    pattern: /\bthis\.\w+/,
    message: "Whisq components are functions, not classes. There is no 'this'.",
    severity: "warning",
  },
  {
    pattern: /html`/,
    message:
      "Use element functions (div, span, button...) instead of html tagged templates.",
    severity: "warning",
  },
  {
    pattern: /document\.getElementById|document\.querySelector(?!All)/,
    message:
      "Direct DOM queries are discouraged in Whisq. Use signals and reactive bindings instead.",
    severity: "warning",
  },
  {
    pattern: /document\.createElement\s*\(/,
    message:
      "Use Whisq element functions (div, span, etc.) instead of document.createElement.",
    severity: "warning",
  },
  {
    pattern: /\.innerHTML\s*=/,
    message:
      "Avoid innerHTML — use raw() for trusted HTML or element functions for structure.",
    severity: "warning",
  },
  {
    pattern: /addEventListener\s*\(/,
    message:
      "Use on* event props (onclick, oninput) instead of addEventListener.",
    severity: "warning",
  },
];

export function validateCode(code: string): ValidationResult {
  const issues: ValidationIssue[] = [];
  const lines = code.split("\n");

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    for (const rule of RULES) {
      if (rule.pattern.test(line)) {
        issues.push({
          line: i + 1,
          message: rule.message,
          severity: rule.severity,
        });
      }
    }
  }

  return {
    valid: issues.filter((i) => i.severity === "error").length === 0,
    issues,
  };
}
