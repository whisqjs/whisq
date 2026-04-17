import { describe, it, expect } from "vitest";
import { scaffoldComponent } from "../tools/scaffold.js";
import { validateCode } from "../tools/validate.js";

// These tests verify that the MCP server tools do NOT execute user-provided
// code — they only analyze or generate text. The strings below contain
// dangerous-looking code patterns purely to verify they're treated as data.

describe("MCP server security", () => {
  describe("scaffold_component — output safety", () => {
    it("generates only import and component code, no arbitrary execution", () => {
      const code = scaffoldComponent({
        name: "Test",
        description: "A test component",
      });

      expect(code).toContain("import");
      expect(code).toContain("@whisq/core");
      expect(code).toContain("component");

      // Output must not contain execution primitives
      expect(code).not.toContain("Function(");
      expect(code).not.toContain("require(");
      expect(code).not.toContain("child_process");
      expect(code).not.toContain("execSync");
      expect(code).not.toContain("fs.");
      expect(code).not.toContain("process.env");
    });

    it("confines user description to JSDoc comment only", () => {
      const maliciousDescription = '"); process.exit(1); //';
      const code = scaffoldComponent({
        name: "Safe",
        description: maliciousDescription,
      });

      // Description is inside a JSDoc comment (safe) — verify it doesn't
      // appear outside comments in executable positions
      const lines = code.split("\n");
      let inComment = false;
      for (const line of lines) {
        const trimmed = line.trim();
        if (trimmed.startsWith("/**") || trimmed.startsWith("*"))
          inComment = true;
        if (trimmed.endsWith("*/")) {
          inComment = false;
          continue;
        }
        if (!inComment && trimmed.includes("process.exit")) {
          throw new Error(`Found process.exit in executable code: ${trimmed}`);
        }
      }
    });

    it("handles special characters in prop names", () => {
      const code = scaffoldComponent({
        name: "Test",
        description: "test",
        props: ['on"click', "class<br>"],
      });

      // Should produce valid output without breaking string boundaries
      expect(code).toContain("component");
    });
  });

  describe("validate_code — static analysis only, no execution", () => {
    it("analyzes dangerous code without executing it", () => {
      // This input contains dangerous patterns — validate must NOT run them
      const dangerousCode = `
        process.exit(1);
        require('fs').unlinkSync('/etc/passwd');
      `;

      // Should return analysis result without side effects
      const result = validateCode(dangerousCode);
      expect(result).toHaveProperty("valid");
      expect(result).toHaveProperty("issues");
    });

    it("handles extremely long input without hanging", () => {
      const longCode = "const x = " + "1 + ".repeat(10_000) + "1;";
      const start = Date.now();
      const result = validateCode(longCode);
      const elapsed = Date.now() - start;

      expect(result).toHaveProperty("valid");
      expect(elapsed).toBeLessThan(1000);
    });

    it("handles empty input", () => {
      const result = validateCode("");
      expect(result).toHaveProperty("valid");
      expect(result).toHaveProperty("issues");
    });

    it("handles binary/garbage input", () => {
      const result = validateCode("\x00\x01\x02\xff\xfe");
      expect(result).toHaveProperty("valid");
      expect(result).toHaveProperty("issues");
    });
  });
});
