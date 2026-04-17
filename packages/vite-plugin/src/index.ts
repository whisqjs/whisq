import * as fs from "node:fs";
import * as path from "node:path";
import type { Plugin, ViteDevServer } from "vite";
import { generateRouteConfig, validateRoutes } from "./file-router.js";

// ── Types ──────────────────────────────────────────────────────────────────

export interface WhisqPluginOptions {
  /** Directory containing page files for file-based routing. Default: "src/pages" */
  pagesDir?: string;
  /** Use lazy imports for automatic code splitting. Default: true */
  codeSplitting?: boolean;
}

// ── Virtual module ID ──────────────────────────────────────────────────────

const VIRTUAL_ROUTES_ID = "virtual:whisq-routes";
const RESOLVED_VIRTUAL_ROUTES_ID = "\0" + VIRTUAL_ROUTES_ID;

// ── Plugin ─────────────────────────────────────────────────────────────────

/**
 * Vite plugin for Whisq applications.
 *
 * Features:
 * - File-based routing from `src/pages/` directory
 * - Automatic code splitting per route (lazy imports)
 * - HMR — route changes hot-reload without full page refresh
 * - Build-time validation (duplicate routes, invalid file names)
 *
 * ```ts
 * // vite.config.ts
 * import { whisqPlugin } from "@whisq/vite-plugin";
 *
 * export default defineConfig({
 *   plugins: [whisqPlugin({ pagesDir: "src/pages" })],
 * });
 * ```
 */
export function whisqPlugin(options: WhisqPluginOptions = {}): Plugin {
  const pagesDir = options.pagesDir ?? "src/pages";
  const codeSplitting = options.codeSplitting !== false;
  let resolvedPagesDir: string;
  let server: ViteDevServer | undefined;

  return {
    name: "whisq",

    configResolved(config) {
      resolvedPagesDir = path.resolve(config.root, pagesDir);
    },

    // ── Build-time validation ────────────────────────────────────────

    buildStart() {
      const files = scanPages(resolvedPagesDir);
      if (files.length === 0) return;

      const routes = generateRouteConfig(files, resolvedPagesDir);
      const warnings = validateRoutes(routes);

      for (const w of warnings) {
        this.warn(w.message);
      }
    },

    // ── Virtual module resolution ────────────────────────────────────

    resolveId(id) {
      if (id === VIRTUAL_ROUTES_ID) {
        return RESOLVED_VIRTUAL_ROUTES_ID;
      }
    },

    load(id) {
      if (id === RESOLVED_VIRTUAL_ROUTES_ID) {
        const files = scanPages(resolvedPagesDir);
        return generateRoutesModule(files, resolvedPagesDir, codeSplitting);
      }
    },

    // ── HMR: watch pages directory ───────────────────────────────────

    configureServer(srv) {
      server = srv;

      // Watch the pages directory for new/deleted files
      if (fs.existsSync(resolvedPagesDir)) {
        srv.watcher.add(resolvedPagesDir);
      }
    },

    handleHotUpdate(ctx) {
      // If a file in the pages directory changed, invalidate the routes module
      if (ctx.file.startsWith(resolvedPagesDir)) {
        const mod = server?.moduleGraph.getModuleById(
          RESOLVED_VIRTUAL_ROUTES_ID,
        );
        if (mod) {
          server!.moduleGraph.invalidateModule(mod);
          return [...ctx.modules, mod];
        }
      }
    },
  };
}

// Keep backward compatibility — also export as `whisq`
export { whisqPlugin as whisq };

// ── File scanning ──────────────────────────────────────────────────────────

const PAGE_EXTENSIONS = new Set([".ts", ".tsx", ".js", ".jsx"]);

function scanPages(pagesDir: string): string[] {
  if (!fs.existsSync(pagesDir)) return [];

  const files: string[] = [];

  function walk(dir: string, prefix: string): void {
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
      // Skip files starting with _ or . (layouts, utilities, hidden files)
      if (entry.name.startsWith("_") || entry.name.startsWith(".")) continue;

      const relPath = prefix ? `${prefix}/${entry.name}` : entry.name;
      if (entry.isDirectory()) {
        walk(path.join(dir, entry.name), relPath);
      } else if (PAGE_EXTENSIONS.has(path.extname(entry.name))) {
        files.push(relPath);
      }
    }
  }

  walk(pagesDir, "");
  return files;
}

// ── Route module generation ────────────────────────────────────────────────

function generateRoutesModule(
  files: string[],
  pagesDir: string,
  codeSplitting: boolean,
): string {
  const routes = generateRouteConfig(files, pagesDir);

  if (codeSplitting) {
    // Lazy imports for automatic code splitting
    const routeDefs = routes.map(
      (r) =>
        `  { path: "${r.path}", component: () => import("${r.filePath}") }`,
    );

    return [
      "export const routes = [",
      routeDefs.join(",\n"),
      "];",
      "",
      "// HMR support",
      "if (import.meta.hot) {",
      "  import.meta.hot.accept();",
      "}",
      "",
    ].join("\n");
  }

  // Static imports (no code splitting)
  const imports = routes.map((r, i) => `import Page${i} from "${r.filePath}";`);

  const routeDefs = routes.map(
    (r, i) => `  { path: "${r.path}", component: Page${i} }`,
  );

  return [
    ...imports,
    "",
    "export const routes = [",
    routeDefs.join(",\n"),
    "];",
    "",
    "// HMR support",
    "if (import.meta.hot) {",
    "  import.meta.hot.accept();",
    "}",
    "",
  ].join("\n");
}

// Re-export for testing
export {
  filePathToRoutePath,
  generateRouteConfig,
  validateRoutes,
} from "./file-router.js";
export type { FileRoute, RouteWarning } from "./file-router.js";
