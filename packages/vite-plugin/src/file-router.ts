import * as path from "node:path";

// ── Types ──────────────────────────────────────────────────────────────────

export interface FileRoute {
  path: string;
  filePath: string;
}

export interface RouteWarning {
  type: "duplicate-route" | "invalid-filename";
  message: string;
}

// ── Path conversion ────────────────────────────────────────────────────────

/**
 * Convert a file path relative to the pages directory into a route pattern.
 *
 * - `index.ts` → `/`
 * - `about.ts` → `/about`
 * - `users/[id].ts` → `/users/:id`
 * - `[...slug].ts` → `*`
 */
export function filePathToRoutePath(filePath: string): string {
  // Remove extension
  let route = filePath.replace(/\.(ts|tsx|js|jsx)$/, "");

  // Normalize path separators
  route = route.replace(/\\/g, "/");

  // Remove trailing /index
  route = route.replace(/\/index$/, "");
  if (route === "index") route = "";

  // Convert catch-all [...param] to *
  if (route.includes("[...")) {
    return "*";
  }

  // Convert dynamic segments [param] to :param
  route = route.replace(/\[(\w+)\]/g, ":$1");

  return "/" + route;
}

// ── Route generation ───────────────────────────────────────────────────────

/**
 * Generate a sorted route config from a list of page files.
 * Static routes come first, dynamic routes next, catch-all last.
 */
export function generateRouteConfig(
  files: string[],
  pagesDir: string,
): FileRoute[] {
  const routes = files.map((file) => ({
    path: filePathToRoutePath(file),
    filePath: path.posix.join(pagesDir, file),
  }));

  // Sort: static first, dynamic second, catch-all last
  return routes.sort((a, b) => {
    const aScore = routeSortScore(a.path);
    const bScore = routeSortScore(b.path);
    if (aScore !== bScore) return aScore - bScore;
    return a.path.localeCompare(b.path);
  });
}

function routeSortScore(routePath: string): number {
  if (routePath === "*") return 2; // catch-all last
  if (routePath.includes(":")) return 1; // dynamic middle
  return 0; // static first
}

// ── Validation ─────────────────────────────────────────────────────────────

/**
 * Validate routes for common mistakes.
 * Returns warnings (does not throw).
 */
export function validateRoutes(routes: FileRoute[]): RouteWarning[] {
  const warnings: RouteWarning[] = [];

  // Check for duplicate route paths
  const seen = new Map<string, string>();
  for (const route of routes) {
    const existing = seen.get(route.path);
    if (existing) {
      warnings.push({
        type: "duplicate-route",
        message: `Duplicate route "${route.path}": "${existing}" and "${route.filePath}" resolve to the same path.`,
      });
    } else {
      seen.set(route.path, route.filePath);
    }
  }

  // Check for invalid filenames (spaces, special chars other than brackets)
  for (const route of routes) {
    const filename = path.basename(route.filePath);
    // Allow alphanumeric, hyphens, underscores, dots, brackets
    if (/[^a-zA-Z0-9\-_.\[\]]/.test(filename)) {
      warnings.push({
        type: "invalid-filename",
        message: `Invalid page filename "${filename}": use only letters, numbers, hyphens, underscores, and brackets.`,
      });
    }
  }

  return warnings;
}
