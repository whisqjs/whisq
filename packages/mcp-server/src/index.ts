#!/usr/bin/env node

import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { z } from "zod";
import { scaffoldComponent } from "./tools/scaffold.js";
import { validateCode } from "./tools/validate.js";
import { queryApi } from "./tools/api-docs.js";
import { analyzeProject } from "./tools/analyze.js";

const server = new McpServer({
  name: "whisq",
  version: "0.1.0-alpha.1",
});

// ── scaffold_component ─────────────────────────────────────────────────────

server.tool(
  "scaffold_component",
  "Generate a Whisq component from a description. Supports multiple patterns: counter, form, list, resource (async data), store (shared state).",
  {
    name: z
      .string()
      .describe("Component name in PascalCase (e.g., 'UserCard')"),
    description: z.string().describe("What the component does"),
    props: z
      .array(z.string())
      .optional()
      .describe("Optional prop names (or field names for form/store patterns)"),
    pattern: z
      .enum(["counter", "form", "list", "resource", "store"])
      .optional()
      .describe("Component pattern (default: counter)"),
  },
  async ({ name, description, props, pattern }) => {
    const code = scaffoldComponent({ name, description, props, pattern });
    return {
      content: [{ type: "text" as const, text: code }],
    };
  },
);

// ── validate_code ──────────────────────────────────────────────────────────

server.tool(
  "validate_code",
  "Check Whisq code for common errors and anti-patterns. Returns validation issues with line numbers.",
  {
    code: z.string().describe("Whisq TypeScript source code to validate"),
  },
  async ({ code }) => {
    const result = validateCode(code);

    if (result.valid && result.issues.length === 0) {
      return {
        content: [
          {
            type: "text" as const,
            text: "✓ Code looks good — no issues found.",
          },
        ],
      };
    }

    const report = result.issues
      .map((i) => `Line ${i.line} [${i.severity}]: ${i.message}`)
      .join("\n");

    return {
      content: [
        {
          type: "text" as const,
          text: result.valid
            ? `⚠ ${result.issues.length} warning(s):\n${report}`
            : `✗ ${result.issues.length} issue(s) found:\n${report}`,
        },
      ],
    };
  },
);

// ── query_api ──────────────────────────────────────────────────────────────

server.tool(
  "query_api",
  "Look up Whisq API documentation by topic. Returns structured reference with code examples. Topics: signals, elements, components, routing, styling, forms, lists, async, ssr, testing, overview.",
  {
    topic: z
      .string()
      .describe(
        "API topic to look up (e.g., 'signals', 'routing', 'components')",
      ),
  },
  async ({ topic }) => {
    const result = queryApi(topic);
    return {
      content: [{ type: "text" as const, text: result.content }],
    };
  },
);

// ── analyze_project ────────────────────────────────────────────────────────

server.tool(
  "analyze_project",
  "Analyze Whisq project code for patterns in use and suggest improvements. Pass source code as text.",
  {
    code: z
      .string()
      .describe(
        "Whisq project source code to analyze (concatenated files or single file)",
      ),
  },
  async ({ code }) => {
    const result = analyzeProject(code);

    const patternList = result.patterns
      .filter((p) => p.found)
      .map((p) => `  • ${p.name}: ${p.count} usage(s)`)
      .join("\n");

    const suggestionList =
      result.suggestions.length > 0
        ? "\n\nSuggestions:\n" +
          result.suggestions.map((s) => `  → ${s}`).join("\n")
        : "";

    return {
      content: [
        {
          type: "text" as const,
          text: `${result.summary}\n\nPatterns detected:\n${patternList || "  (none)"}${suggestionList}`,
        },
      ],
    };
  },
);

// ── Start server ───────────────────────────────────────────────────────────

async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
}

main().catch(console.error);

// Re-export for testing
export { scaffoldComponent } from "./tools/scaffold.js";
export { validateCode } from "./tools/validate.js";
export { queryApi } from "./tools/api-docs.js";
export { analyzeProject } from "./tools/analyze.js";
export type { ScaffoldInput } from "./tools/scaffold.js";
export type { ValidationResult, ValidationIssue } from "./tools/validate.js";
export type { ApiDocResult, ApiTopic } from "./tools/api-docs.js";
export type { AnalysisResult, PatternDetection } from "./tools/analyze.js";
