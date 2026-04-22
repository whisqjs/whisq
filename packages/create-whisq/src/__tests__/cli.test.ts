import { describe, it, expect, beforeEach, afterEach } from "vitest";
import * as fs from "node:fs";
import * as path from "node:path";
import * as os from "node:os";
import { createProject, TEMPLATES } from "../index.js";

// ── Test helpers ────────────────────────────────────────────────────────────

let tmpDir: string;

beforeEach(() => {
  tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "create-whisq-test-"));
});

afterEach(() => {
  fs.rmSync(tmpDir, { recursive: true, force: true });
});

// ── Template registry ─────────────────────────────────────────────────────

describe("TEMPLATES", () => {
  it("exports 4 templates", () => {
    expect(TEMPLATES).toHaveLength(4);
    expect(TEMPLATES.map((t) => t.name)).toEqual([
      "minimal",
      "full-app",
      "ssr",
      "vite-plugin",
    ]);
  });

  it("each template has name, label, and description", () => {
    for (const t of TEMPLATES) {
      expect(t.name).toBeTruthy();
      expect(t.label).toBeTruthy();
      expect(t.description).toBeTruthy();
    }
  });
});

// ── createProject — minimal ───────────────────────────────────────────────

describe("createProject — minimal", () => {
  it("generates project directory with expected files", () => {
    const projectDir = path.join(tmpDir, "my-app");

    createProject({ projectName: projectDir, template: "minimal" });

    expect(fs.existsSync(path.join(projectDir, "package.json"))).toBe(true);
    expect(fs.existsSync(path.join(projectDir, "index.html"))).toBe(true);
    expect(fs.existsSync(path.join(projectDir, "tsconfig.json"))).toBe(true);
    expect(fs.existsSync(path.join(projectDir, "vite.config.ts"))).toBe(true);
    expect(fs.existsSync(path.join(projectDir, "src", "main.ts"))).toBe(true);
  });

  it("generated package.json has correct name and dependencies", () => {
    const projectDir = path.join(tmpDir, "test-project");

    createProject({ projectName: projectDir, template: "minimal" });

    const pkg = JSON.parse(
      fs.readFileSync(path.join(projectDir, "package.json"), "utf-8"),
    );
    expect(pkg.name).toBe("test-project");
    expect(pkg.dependencies["@whisq/core"]).toBeDefined();
  });

  it("generated main.ts contains Whisq imports", () => {
    const projectDir = path.join(tmpDir, "whisq-app");

    createProject({ projectName: projectDir, template: "minimal" });

    const mainTs = fs.readFileSync(
      path.join(projectDir, "src", "main.ts"),
      "utf-8",
    );
    expect(mainTs).toContain("@whisq/core");
    expect(mainTs).toContain("mount");
    expect(mainTs).toContain("component");
  });

  it("removes .tmpl files after processing", () => {
    const projectDir = path.join(tmpDir, "no-tmpl");

    createProject({ projectName: projectDir, template: "minimal" });

    expect(fs.existsSync(path.join(projectDir, "package.json.tmpl"))).toBe(
      false,
    );
    expect(fs.existsSync(path.join(projectDir, "package.json"))).toBe(true);
  });

  it("includes CLAUDE.md", () => {
    const projectDir = path.join(tmpDir, "has-claude");

    createProject({ projectName: projectDir, template: "minimal" });

    expect(fs.existsSync(path.join(projectDir, "CLAUDE.md"))).toBe(true);
    const content = fs.readFileSync(
      path.join(projectDir, "CLAUDE.md"),
      "utf-8",
    );
    expect(content).toContain("Whisq");
  });

  it("includes .cursorrules", () => {
    const projectDir = path.join(tmpDir, "has-cursor");

    createProject({ projectName: projectDir, template: "minimal" });

    expect(fs.existsSync(path.join(projectDir, ".cursorrules"))).toBe(true);
    const content = fs.readFileSync(
      path.join(projectDir, ".cursorrules"),
      "utf-8",
    );
    expect(content).toContain("Whisq");
    expect(content).toContain("signal");
  });
});

// ── createProject — full-app ──────────────────────────────────────────────

describe("createProject — full-app", () => {
  it("generates router-based project structure", () => {
    const projectDir = path.join(tmpDir, "full-app");

    createProject({ projectName: projectDir, template: "full-app" });

    expect(fs.existsSync(path.join(projectDir, "package.json"))).toBe(true);
    expect(fs.existsSync(path.join(projectDir, "src", "App.ts"))).toBe(true);
    expect(fs.existsSync(path.join(projectDir, "src", "main.ts"))).toBe(true);
    expect(
      fs.existsSync(path.join(projectDir, "src", "pages", "Home.ts")),
    ).toBe(true);
    expect(
      fs.existsSync(path.join(projectDir, "src", "pages", "About.ts")),
    ).toBe(true);
    expect(
      fs.existsSync(path.join(projectDir, "src", "stores", "counter.ts")),
    ).toBe(true);
    expect(fs.existsSync(path.join(projectDir, "src", "styles.ts"))).toBe(true);
  });

  it("depends on @whisq/router", () => {
    const projectDir = path.join(tmpDir, "full-app-deps");

    createProject({ projectName: projectDir, template: "full-app" });

    const pkg = JSON.parse(
      fs.readFileSync(path.join(projectDir, "package.json"), "utf-8"),
    );
    expect(pkg.dependencies["@whisq/core"]).toBeDefined();
    expect(pkg.dependencies["@whisq/router"]).toBeDefined();
  });

  it("App.ts uses router imports", () => {
    const projectDir = path.join(tmpDir, "full-app-router");

    createProject({ projectName: projectDir, template: "full-app" });

    const app = fs.readFileSync(
      path.join(projectDir, "src", "App.ts"),
      "utf-8",
    );
    expect(app).toContain("@whisq/router");
    expect(app).toContain("createRouter");
    expect(app).toContain("RouterView");
  });

  it("includes CLAUDE.md and .cursorrules", () => {
    const projectDir = path.join(tmpDir, "full-app-ai");

    createProject({ projectName: projectDir, template: "full-app" });

    expect(fs.existsSync(path.join(projectDir, "CLAUDE.md"))).toBe(true);
    expect(fs.existsSync(path.join(projectDir, ".cursorrules"))).toBe(true);
  });

  it("scaffolds components/ with at least one reusable component", () => {
    const projectDir = path.join(tmpDir, "full-app-components");

    createProject({ projectName: projectDir, template: "full-app" });

    const componentsDir = path.join(projectDir, "src", "components");
    expect(fs.existsSync(componentsDir)).toBe(true);
    const componentFiles = fs
      .readdirSync(componentsDir)
      .filter((f) => f.endsWith(".ts"));
    expect(componentFiles.length).toBeGreaterThan(0);
  });

  it("scaffolds lib/ with at least one utility (no Whisq imports)", () => {
    const projectDir = path.join(tmpDir, "full-app-lib");

    createProject({ projectName: projectDir, template: "full-app" });

    const libDir = path.join(projectDir, "src", "lib");
    expect(fs.existsSync(libDir)).toBe(true);
    const libFiles = fs
      .readdirSync(libDir)
      .filter((f) => f.endsWith(".ts"));
    expect(libFiles.length).toBeGreaterThan(0);

    // lib/ is Whisq-free: utilities should be testable in isolation.
    for (const file of libFiles) {
      const contents = fs.readFileSync(path.join(libDir, file), "utf-8");
      expect(contents).not.toMatch(/from\s+["']@whisq\//);
    }
  });

  it("App.ts wraps route content in errorBoundary", () => {
    const projectDir = path.join(tmpDir, "full-app-error-boundary");

    createProject({ projectName: projectDir, template: "full-app" });

    const app = fs.readFileSync(
      path.join(projectDir, "src", "App.ts"),
      "utf-8",
    );
    expect(app).toContain("errorBoundary");
  });
});

// ── createProject — ssr ───────────────────────────────────────────────────

describe("createProject — ssr", () => {
  it("generates SSR project structure", () => {
    const projectDir = path.join(tmpDir, "ssr-app");

    createProject({ projectName: projectDir, template: "ssr" });

    expect(fs.existsSync(path.join(projectDir, "package.json"))).toBe(true);
    expect(fs.existsSync(path.join(projectDir, "src", "main.ts"))).toBe(true);
    expect(fs.existsSync(path.join(projectDir, "server", "index.ts"))).toBe(
      true,
    );
    expect(fs.existsSync(path.join(projectDir, "tsconfig.server.json"))).toBe(
      true,
    );
  });

  it("depends on @whisq/ssr", () => {
    const projectDir = path.join(tmpDir, "ssr-deps");

    createProject({ projectName: projectDir, template: "ssr" });

    const pkg = JSON.parse(
      fs.readFileSync(path.join(projectDir, "package.json"), "utf-8"),
    );
    expect(pkg.dependencies["@whisq/core"]).toBeDefined();
    expect(pkg.dependencies["@whisq/ssr"]).toBeDefined();
  });

  it("has serve script", () => {
    const projectDir = path.join(tmpDir, "ssr-scripts");

    createProject({ projectName: projectDir, template: "ssr" });

    const pkg = JSON.parse(
      fs.readFileSync(path.join(projectDir, "package.json"), "utf-8"),
    );
    expect(pkg.scripts.serve).toBeDefined();
  });

  it("includes CLAUDE.md and .cursorrules", () => {
    const projectDir = path.join(tmpDir, "ssr-ai");

    createProject({ projectName: projectDir, template: "ssr" });

    expect(fs.existsSync(path.join(projectDir, "CLAUDE.md"))).toBe(true);
    expect(fs.existsSync(path.join(projectDir, ".cursorrules"))).toBe(true);
  });
});

// ── createProject — vite-plugin ───────────────────────────────────────────

describe("createProject — vite-plugin", () => {
  it("generates vite-plugin project structure", () => {
    const projectDir = path.join(tmpDir, "vite-app");

    createProject({ projectName: projectDir, template: "vite-plugin" });

    expect(fs.existsSync(path.join(projectDir, "package.json"))).toBe(true);
    expect(fs.existsSync(path.join(projectDir, "vite.config.ts"))).toBe(true);
    expect(fs.existsSync(path.join(projectDir, "src", "main.ts"))).toBe(true);
    expect(
      fs.existsSync(path.join(projectDir, "src", "pages", "index.ts")),
    ).toBe(true);
    expect(
      fs.existsSync(path.join(projectDir, "src", "pages", "about.ts")),
    ).toBe(true);
  });

  it("vite.config uses whisqPlugin", () => {
    const projectDir = path.join(tmpDir, "vite-config");

    createProject({ projectName: projectDir, template: "vite-plugin" });

    const config = fs.readFileSync(
      path.join(projectDir, "vite.config.ts"),
      "utf-8",
    );
    expect(config).toContain("whisqPlugin");
    expect(config).toContain("@whisq/vite-plugin");
  });

  it("depends on @whisq/vite-plugin as devDependency", () => {
    const projectDir = path.join(tmpDir, "vite-deps");

    createProject({ projectName: projectDir, template: "vite-plugin" });

    const pkg = JSON.parse(
      fs.readFileSync(path.join(projectDir, "package.json"), "utf-8"),
    );
    expect(pkg.devDependencies["@whisq/vite-plugin"]).toBeDefined();
    expect(pkg.dependencies["@whisq/router"]).toBeDefined();
  });

  it("includes CLAUDE.md and .cursorrules", () => {
    const projectDir = path.join(tmpDir, "vite-ai");

    createProject({ projectName: projectDir, template: "vite-plugin" });

    expect(fs.existsSync(path.join(projectDir, "CLAUDE.md"))).toBe(true);
    expect(fs.existsSync(path.join(projectDir, ".cursorrules"))).toBe(true);
  });
});

// ── Error handling ────────────────────────────────────────────────────────

describe("error handling", () => {
  it("throws for non-empty existing directory", () => {
    const projectDir = path.join(tmpDir, "existing");
    fs.mkdirSync(projectDir);
    fs.writeFileSync(path.join(projectDir, "file.txt"), "exists");

    expect(() =>
      createProject({ projectName: projectDir, template: "minimal" }),
    ).toThrow("already exists and is not empty");
  });

  it("throws for unknown template", () => {
    const projectDir = path.join(tmpDir, "bad-template");

    expect(() =>
      createProject({ projectName: projectDir, template: "nonexistent" }),
    ).toThrow('Template "nonexistent" not found');
  });
});
