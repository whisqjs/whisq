/**
 * Analyze Whisq project code for patterns and suggest improvements.
 * Receives source code as text — no file system access.
 */

export interface AnalysisResult {
  patterns: PatternDetection[];
  suggestions: string[];
  summary: string;
}

export interface PatternDetection {
  name: string;
  found: boolean;
  count: number;
}

const PATTERN_CHECKS: { name: string; pattern: RegExp }[] = [
  { name: "signals", pattern: /\bsignal\s*[<(]/g },
  { name: "computed values", pattern: /\bcomputed\s*\(/g },
  { name: "effects", pattern: /\beffect\s*\(/g },
  { name: "components", pattern: /\bcomponent\s*\(/g },
  { name: "onMount hooks", pattern: /\bonMount\s*\(/g },
  { name: "onCleanup hooks", pattern: /\bonCleanup\s*\(/g },
  { name: "conditional rendering (when)", pattern: /\bwhen\s*\(/g },
  { name: "list rendering (each)", pattern: /\beach\s*\(/g },
  { name: "resource (async data)", pattern: /\bresource\s*\(/g },
  { name: "sheet (CSS-in-JS)", pattern: /\bsheet\s*\(/g },
  { name: "theme tokens", pattern: /\btheme\s*\(/g },
  { name: "router usage", pattern: /\bcreateRouter\s*\(/g },
  {
    name: "store pattern (exported signals)",
    pattern: /export\s+const\s+\w+\s*=\s*signal\s*[<(]/g,
  },
  { name: "mount calls", pattern: /\bmount\s*\(/g },
  { name: "raw HTML", pattern: /\braw\s*\(/g },
  { name: "batch updates", pattern: /\bbatch\s*\(/g },
];

export function analyzeProject(code: string): AnalysisResult {
  const patterns: PatternDetection[] = [];
  const suggestions: string[] = [];

  // Detect patterns
  for (const check of PATTERN_CHECKS) {
    const matches = code.match(check.pattern);
    const count = matches?.length ?? 0;
    patterns.push({ name: check.name, found: count > 0, count });
  }

  const hasSignals = patterns.find((p) => p.name === "signals")?.found ?? false;
  const hasComputed =
    patterns.find((p) => p.name === "computed values")?.found ?? false;
  const hasEffects = patterns.find((p) => p.name === "effects")?.found ?? false;
  const hasComponents =
    patterns.find((p) => p.name === "components")?.found ?? false;
  const hasSheet =
    patterns.find((p) => p.name === "sheet (CSS-in-JS)")?.found ?? false;
  const hasTheme =
    patterns.find((p) => p.name === "theme tokens")?.found ?? false;
  const hasRouter =
    patterns.find((p) => p.name === "router usage")?.found ?? false;
  const hasResource =
    patterns.find((p) => p.name === "resource (async data)")?.found ?? false;
  const hasWhen =
    patterns.find((p) => p.name === "conditional rendering (when)")?.found ??
    false;
  const hasEach =
    patterns.find((p) => p.name === "list rendering (each)")?.found ?? false;
  const hasBatch =
    patterns.find((p) => p.name === "batch updates")?.found ?? false;
  const hasOnMount =
    patterns.find((p) => p.name === "onMount hooks")?.found ?? false;

  // Generate suggestions based on what's missing
  if (hasSignals && !hasComputed) {
    suggestions.push(
      "Consider using computed() for derived values instead of recalculating in effects.",
    );
  }

  if (hasSignals && !hasSheet) {
    suggestions.push(
      "Consider using sheet() for scoped CSS-in-JS styling instead of inline styles or global CSS.",
    );
  }

  if (hasSheet && !hasTheme) {
    suggestions.push(
      "Consider using theme() to define design tokens (colors, spacing) for consistency.",
    );
  }

  if (hasComponents && !hasOnMount) {
    suggestions.push(
      "Use onMount() for side effects that should run after component insertion (API calls, timers, subscriptions).",
    );
  }

  if (hasEffects && !hasBatch) {
    suggestions.push(
      "If updating multiple signals at once, use batch() to avoid unnecessary re-renders.",
    );
  }

  if (!hasRouter && code.includes("/pages/")) {
    suggestions.push(
      "Detected a pages/ directory — consider using @whisq/router for client-side routing.",
    );
  }

  if (!hasResource && (code.includes("fetch(") || code.includes("axios"))) {
    suggestions.push(
      "Consider using resource() from @whisq/core for declarative async data loading with loading/error states.",
    );
  }

  if (
    hasSignals &&
    !hasWhen &&
    (code.includes("? ") || code.includes("if ("))
  ) {
    suggestions.push(
      "Consider using when() for conditional rendering — it provides cleaner reactive branching.",
    );
  }

  if (hasSignals && !hasEach && code.includes(".map(")) {
    suggestions.push(
      "Consider using each() for list rendering — it provides optimized keyed reconciliation.",
    );
  }

  // Build summary
  const foundPatterns = patterns.filter((p) => p.found);
  const summary =
    foundPatterns.length === 0
      ? "No Whisq patterns detected. This may not be a Whisq project."
      : `Found ${foundPatterns.length} Whisq pattern(s): ${foundPatterns.map((p) => `${p.name} (${p.count})`).join(", ")}.`;

  return { patterns, suggestions, summary };
}
