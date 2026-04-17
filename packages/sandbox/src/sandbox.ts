// ── Types ──────────────────────────────────────────────────────────────────

export interface SandboxOptions {
  /** Maximum execution time in milliseconds. Default: 5000 */
  timeout?: number;
}

export interface ExecutionResult {
  success: boolean;
  value?: unknown;
  error?: string;
}

export interface Sandbox {
  execute(code: string): Promise<ExecutionResult>;
  onMessage(handler: (message: unknown) => void): void;
  dispose(): void;
}

// ── Blocked globals ────────────────────────────────────────────────────────

const BLOCKED_GLOBALS = [
  "document",
  "window",
  "globalThis",
  "self",
  "fetch",
  "XMLHttpRequest",
  "WebSocket",
  "localStorage",
  "sessionStorage",
  "indexedDB",
  "navigator",
  "location",
  "history",
  "alert",
  "confirm",
  "prompt",
  "importScripts",
] as const;

// ── Sandbox implementation ─────────────────────────────────────────────────

// NOTE: This MVP uses `new Function()` with a restricted scope to shadow
// dangerous globals. This is an intentional design choice for the sandbox
// package — its entire purpose is to evaluate arbitrary user-provided code
// in a controlled environment. A future version will replace this with
// QuickJS compiled to WASM for true process-level isolation.
// eslint-disable-next-line @typescript-eslint/no-implied-eval

const FunctionConstructor = Function;

/**
 * Create an isolated code execution sandbox.
 *
 * The MVP uses `new Function()` with a restricted scope that shadows
 * dangerous globals. A future version will use QuickJS WASM for true isolation.
 *
 * ```ts
 * const sandbox = createSandbox({ timeout: 5000 });
 * const result = await sandbox.execute('return 1 + 1');
 * ```
 */
export function createSandbox(options: SandboxOptions = {}): Sandbox {
  const timeout = options.timeout ?? 5000;
  let disposed = false;
  let messageHandler: ((message: unknown) => void) | null = null;

  return {
    async execute(code: string): Promise<ExecutionResult> {
      if (disposed) {
        return { success: false, error: "Sandbox is disposed" };
      }

      // Build a restricted scope that blocks dangerous globals
      const blockedParams = BLOCKED_GLOBALS.join(", ");
      const blockedArgs = BLOCKED_GLOBALS.map(() => undefined);

      // Create a postMessage function that routes to the handler
      const postMessage = (msg: unknown) => {
        if (messageHandler) messageHandler(msg);
      };

      try {
        const wrappedCode = `"use strict";\n${code}`;

        // Intentional: sandbox's purpose is to execute arbitrary code
        // with global access restricted via parameter shadowing
        const fn = FunctionConstructor(
          blockedParams,
          "postMessage",
          wrappedCode,
        );

        // Execute with timeout
        const result = await Promise.race([
          Promise.resolve().then(() => fn(...blockedArgs, postMessage)),
          new Promise<never>((_, reject) =>
            setTimeout(() => reject(new Error("Execution timeout")), timeout),
          ),
        ]);

        return { success: true, value: result };
      } catch (e) {
        const message = e instanceof Error ? e.message : String(e);
        return { success: false, error: message };
      }
    },

    onMessage(handler: (message: unknown) => void): void {
      messageHandler = handler;
    },

    dispose(): void {
      disposed = true;
      messageHandler = null;
    },
  };
}
