import type { ReadonlySignal } from "@whisq/core";

// ── Types ──────────────────────────────────────────────────────────────────

export interface SignalInfo {
  name: string;
  value: unknown;
}

export interface DevToolsEvent {
  type: string;
  data: Record<string, unknown>;
  timestamp: number;
}

export interface DevToolsHook {
  version: string;
  registerSignal(name: string, signal: ReadonlySignal<unknown>): void;
  unregisterSignal(name: string): void;
  getSignals(): SignalInfo[];
  registerComponent(name: string): void;
  unregisterComponent(name: string): void;
  getComponents(): string[];
  logEvent(type: string, data: Record<string, unknown>): void;
  getEvents(): DevToolsEvent[];
  clearEvents(): void;
}

// ── Implementation ─────────────────────────────────────────────────────────

function createHook(): DevToolsHook {
  const signals = new Map<string, ReadonlySignal<unknown>>();
  const components = new Set<string>();
  const events: DevToolsEvent[] = [];

  return {
    version: "0.0.1-alpha.0",

    registerSignal(name: string, signal: ReadonlySignal<unknown>): void {
      signals.set(name, signal);
    },

    unregisterSignal(name: string): void {
      signals.delete(name);
    },

    getSignals(): SignalInfo[] {
      const result: SignalInfo[] = [];
      for (const [name, sig] of signals) {
        result.push({ name, value: sig.peek() });
      }
      return result;
    },

    registerComponent(name: string): void {
      components.add(name);
    },

    unregisterComponent(name: string): void {
      components.delete(name);
    },

    getComponents(): string[] {
      return [...components];
    },

    logEvent(type: string, data: Record<string, unknown>): void {
      events.push({ type, data, timestamp: Date.now() });
    },

    getEvents(): DevToolsEvent[] {
      return [...events];
    },

    clearEvents(): void {
      events.length = 0;
    },
  };
}

// ── Public API ─────────────────────────────────────────────────────────────

/**
 * Install the Whisq DevTools hook on the global object.
 * The hook is accessible at `window.__WHISQ_DEVTOOLS__` for browser
 * extensions and console inspection.
 *
 * ```ts
 * import { connectDevTools } from "@whisq/devtools";
 * connectDevTools();
 * ```
 */
export function connectDevTools(): void {
  (globalThis as any).__WHISQ_DEVTOOLS__ = createHook();
}

/**
 * Remove the Whisq DevTools hook from the global object.
 */
export function disconnectDevTools(): void {
  delete (globalThis as any).__WHISQ_DEVTOOLS__;
}
