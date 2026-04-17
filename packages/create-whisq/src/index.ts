#!/usr/bin/env node

import * as fs from "node:fs";
import * as path from "node:path";
import * as readline from "node:readline";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// ── Types ──────────────────────────────────────────────────────────────────

export interface CreateOptions {
  projectName: string;
  template: string;
}

export interface TemplateInfo {
  name: string;
  label: string;
  description: string;
}

// ── Templates ─────────────────────────────────────────────────────────────

export const TEMPLATES: TemplateInfo[] = [
  {
    name: "minimal",
    label: "Minimal",
    description: "Signal + Vite — just the essentials",
  },
  {
    name: "full-app",
    label: "Full App",
    description: "Router + pages + store pattern",
  },
  {
    name: "ssr",
    label: "SSR",
    description: "Server-side rendering with @whisq/ssr",
  },
  {
    name: "vite-plugin",
    label: "Vite Plugin",
    description: "File-based routing with @whisq/vite-plugin",
  },
];

// ── Template handling ──────────────────────────────────────────────────────

function getTemplateDir(template: string): string {
  return path.resolve(__dirname, "templates", template);
}

function copyDir(src: string, dest: string): void {
  fs.mkdirSync(dest, { recursive: true });

  for (const entry of fs.readdirSync(src, { withFileTypes: true })) {
    const srcPath = path.join(src, entry.name);
    const destPath = path.join(dest, entry.name);

    if (entry.isDirectory()) {
      copyDir(srcPath, destPath);
    } else {
      fs.copyFileSync(srcPath, destPath);
    }
  }
}

function processTemplate(projectDir: string, projectName: string): void {
  const pkgName = path.basename(projectName);

  const tmplFile = path.join(projectDir, "package.json.tmpl");
  if (fs.existsSync(tmplFile)) {
    let content = fs.readFileSync(tmplFile, "utf-8");
    content = content.replace(/\{\{name\}\}/g, pkgName);
    fs.writeFileSync(path.join(projectDir, "package.json"), content);
    fs.unlinkSync(tmplFile);
  }
}

// ── Main ───────────────────────────────────────────────────────────────────

export function createProject(options: CreateOptions): string {
  const { projectName, template } = options;
  const projectDir = path.resolve(process.cwd(), projectName);

  if (fs.existsSync(projectDir) && fs.readdirSync(projectDir).length > 0) {
    throw new Error(
      `Directory "${projectName}" already exists and is not empty.`,
    );
  }

  const templateDir = getTemplateDir(template);
  if (!fs.existsSync(templateDir)) {
    throw new Error(`Template "${template}" not found.`);
  }

  copyDir(templateDir, projectDir);
  processTemplate(projectDir, projectName);

  return projectDir;
}

// ── Interactive prompts ───────────────────────────────────────────────────

function createInterface(): readline.Interface {
  return readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });
}

function ask(rl: readline.Interface, question: string): Promise<string> {
  return new Promise((resolve) => {
    rl.question(question, (answer) => resolve(answer.trim()));
  });
}

async function promptProjectName(rl: readline.Interface): Promise<string> {
  const name = await ask(rl, "  Project name: ");
  if (!name) {
    console.log("  Project name is required.");
    return promptProjectName(rl);
  }
  return name;
}

async function promptTemplate(rl: readline.Interface): Promise<string> {
  console.log("\n  Select a template:\n");
  for (let i = 0; i < TEMPLATES.length; i++) {
    const t = TEMPLATES[i];
    console.log(`    ${i + 1}. ${t.label.padEnd(14)} ${t.description}`);
  }
  console.log();

  const answer = await ask(rl, "  Template (1-4, default: 1): ");
  const num = parseInt(answer, 10);

  if (!answer) return TEMPLATES[0].name;
  if (num >= 1 && num <= TEMPLATES.length) return TEMPLATES[num - 1].name;

  // Check if they typed the template name directly
  const match = TEMPLATES.find((t) => t.name === answer);
  if (match) return match.name;

  console.log("  Invalid selection, using minimal.");
  return TEMPLATES[0].name;
}

// ── Post-create instructions ──────────────────────────────────────────────

function getPostCreateInstructions(
  projectName: string,
  template: string,
): string {
  const base = `
  Next steps:
    cd ${projectName}
    npm install
    npm run dev`;

  const extras: Record<string, string> = {
    ssr: `

  To build and serve with SSR:
    npm run build
    npm run serve`,
    "full-app": `

  Project includes:
    src/pages/     Route pages (Home, About)
    src/stores/    Shared state (signals)`,
    "vite-plugin": `

  File-based routing:
    src/pages/index.ts   -> /
    src/pages/about.ts   -> /about
    src/pages/[id].ts    -> /:id`,
  };

  return base + (extras[template] ?? "");
}

// ── CLI entry point ────────────────────────────────────────────────────────

async function main(): Promise<void> {
  const args = process.argv.slice(2);

  if (args.includes("--help") || args.includes("-h")) {
    console.log(`
  Usage: create-whisq [project-name] [--template <name>]

  Templates:
    minimal        Signal + Vite (default)
    full-app       Router + pages + store
    ssr            Server-side rendering
    vite-plugin    File-based routing

  Examples:
    npm create whisq@latest my-app
    npm create whisq@latest my-app --template full-app
    pnpm create whisq my-app
    npx create-whisq my-app
`);
    process.exit(0);
  }

  const templateIdx = args.indexOf("--template");
  const hasTemplateFlag = templateIdx !== -1;
  const flagTemplate = hasTemplateFlag ? args[templateIdx + 1] : undefined;

  // Filter out --template and its value from positional args
  const positional = args.filter(
    (_arg, i) =>
      i !== templateIdx && (templateIdx === -1 || i !== templateIdx + 1),
  );

  let projectName = positional[0];
  let template = flagTemplate;

  // Interactive mode if missing project name or template
  if (!projectName || !template) {
    console.log("\n  create-whisq\n");

    const rl = createInterface();

    if (!projectName) {
      projectName = await promptProjectName(rl);
    }

    if (!template) {
      template = await promptTemplate(rl);
    }

    rl.close();
  }

  // Validate template
  if (!TEMPLATES.find((t) => t.name === template)) {
    console.error(`  Error: Unknown template "${template}".`);
    console.error(`  Available: ${TEMPLATES.map((t) => t.name).join(", ")}`);
    process.exit(1);
  }

  try {
    createProject({ projectName, template });

    const info = TEMPLATES.find((t) => t.name === template)!;
    console.log(
      `\n  Project "${projectName}" created with ${info.label} template.`,
    );
    console.log(getPostCreateInstructions(projectName, template));
    console.log();
  } catch (err) {
    console.error(`  Error: ${(err as Error).message}`);
    process.exit(1);
  }
}

// Only run CLI when executed directly, not when imported as a module
const isDirectRun =
  process.argv[1]?.endsWith("create-whisq") ||
  process.argv[1]?.endsWith("index.js");
if (isDirectRun) {
  main();
}
