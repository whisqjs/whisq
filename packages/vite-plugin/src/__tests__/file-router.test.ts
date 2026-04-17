import { describe, it, expect } from "vitest";
import {
  filePathToRoutePath,
  generateRouteConfig,
  validateRoutes,
} from "../file-router.js";

// ── filePathToRoutePath ───────────────────────────────────────────────────

describe("filePathToRoutePath", () => {
  it("converts index.ts to /", () => {
    expect(filePathToRoutePath("index.ts")).toBe("/");
  });

  it("converts about.ts to /about", () => {
    expect(filePathToRoutePath("about.ts")).toBe("/about");
  });

  it("converts nested path to route", () => {
    expect(filePathToRoutePath("users/profile.ts")).toBe("/users/profile");
  });

  it("converts nested index to parent path", () => {
    expect(filePathToRoutePath("users/index.ts")).toBe("/users");
  });

  it("converts [id].ts to /:id (dynamic segment)", () => {
    expect(filePathToRoutePath("[id].ts")).toBe("/:id");
  });

  it("converts users/[id].ts to /users/:id", () => {
    expect(filePathToRoutePath("users/[id].ts")).toBe("/users/:id");
  });

  it("converts [...slug].ts to catch-all *", () => {
    expect(filePathToRoutePath("[...slug].ts")).toBe("*");
  });

  it("handles .tsx extension", () => {
    expect(filePathToRoutePath("about.tsx")).toBe("/about");
  });

  it("handles deeply nested paths", () => {
    expect(filePathToRoutePath("admin/users/[id]/settings.ts")).toBe(
      "/admin/users/:id/settings",
    );
  });
});

// ── generateRouteConfig ───────────────────────────────────────────────────

describe("generateRouteConfig", () => {
  it("generates route config from file list", () => {
    const files = ["index.ts", "about.ts", "users/[id].ts"];
    const routes = generateRouteConfig(files, "/app/src/pages");

    expect(routes).toHaveLength(3);
    expect(routes[0]).toEqual({
      path: "/",
      filePath: "/app/src/pages/index.ts",
    });
    expect(routes[1]).toEqual({
      path: "/about",
      filePath: "/app/src/pages/about.ts",
    });
    expect(routes[2]).toEqual({
      path: "/users/:id",
      filePath: "/app/src/pages/users/[id].ts",
    });
  });

  it("sorts routes: static before dynamic, catch-all last", () => {
    const files = ["[...slug].ts", "[id].ts", "about.ts", "index.ts"];
    const routes = generateRouteConfig(files, "/pages");

    const paths = routes.map((r) => r.path);
    expect(paths).toEqual(["/", "/about", "/:id", "*"]);
  });

  it("handles empty file list", () => {
    const routes = generateRouteConfig([], "/pages");
    expect(routes).toEqual([]);
  });
});

// ── validateRoutes ────────────────────────────────────────────────────────

describe("validateRoutes", () => {
  it("returns no warnings for valid routes", () => {
    const routes = [
      { path: "/", filePath: "/pages/index.ts" },
      { path: "/about", filePath: "/pages/about.ts" },
      { path: "/users/:id", filePath: "/pages/users/[id].ts" },
    ];
    expect(validateRoutes(routes)).toEqual([]);
  });

  it("detects duplicate routes", () => {
    const routes = [
      { path: "/about", filePath: "/pages/about.ts" },
      { path: "/about", filePath: "/pages/about/index.ts" },
    ];
    const warnings = validateRoutes(routes);
    expect(warnings).toHaveLength(1);
    expect(warnings[0].type).toBe("duplicate-route");
    expect(warnings[0].message).toContain("/about");
  });

  it("detects invalid filenames with spaces", () => {
    const routes = [{ path: "/my page", filePath: "/pages/my page.ts" }];
    const warnings = validateRoutes(routes);
    expect(warnings).toHaveLength(1);
    expect(warnings[0].type).toBe("invalid-filename");
  });

  it("allows valid filenames with brackets", () => {
    const routes = [
      { path: "/users/:id", filePath: "/pages/[id].ts" },
      { path: "*", filePath: "/pages/[...slug].ts" },
    ];
    expect(validateRoutes(routes)).toEqual([]);
  });

  it("detects multiple issues", () => {
    const routes = [
      { path: "/about", filePath: "/pages/about.ts" },
      { path: "/about", filePath: "/pages/about/index.ts" },
      { path: "/bad page", filePath: "/pages/bad page.ts" },
    ];
    const warnings = validateRoutes(routes);
    expect(warnings).toHaveLength(2);
    expect(warnings.map((w) => w.type)).toContain("duplicate-route");
    expect(warnings.map((w) => w.type)).toContain("invalid-filename");
  });
});
