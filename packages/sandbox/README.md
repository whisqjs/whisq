# @whisq/sandbox

Two isolation primitives for Whisq: a **code-execution sandbox** that evaluates arbitrary source and returns a value, and a **UI-rendering sandbox** that mounts AI-generated Whisq source into an isolated iframe on the current page. Both are standards-only (no WASM, no extra runtime) so they compose with any Whisq app.

## Install

```bash
npm install @whisq/sandbox
```

## `createSandbox()` — run arbitrary code, return a value

```ts
import { createSandbox } from "@whisq/sandbox";

const sandbox = createSandbox({ timeout: 5000 });

const result = await sandbox.execute(`
  const count = 1 + 1;
  return count;
`);

console.log(result); // { success: true, value: 2 }

sandbox.dispose();
```

Shadows dangerous globals and enforces a timeout. Suitable for evaluating expressions or small scripts where you want the **return value** rather than a UI. A future revision may back this with QuickJS-WASM for true process-level isolation.

## `mountSandboxed()` — render AI-generated Whisq UI into an iframe

Mount an AI-generated Whisq fragment into a sandboxed iframe on the current page. Uses `<iframe sandbox="allow-scripts" srcdoc="…">` with a strict CSP — the frame runs in a unique origin, can't access the parent's DOM, and only fetches scripts from origins listed in your import map.

```ts
import { mountSandboxed } from "@whisq/sandbox";

const handle = mountSandboxed({
  source: `
    import { div, signal } from "@whisq/core";
    const n = signal(0);
    setInterval(() => (n.value += 1), 1000);
    document.body.append(div(() => String(n.value)).el);
    window.__whisqPost({ type: "ready" });
  `,
  container: document.getElementById("agent-output")!,
  importMap: { "@whisq/core": "https://esm.sh/@whisq/core@latest" },
  onMessage: (msg) => console.log("from sandbox:", msg),
});

// Send a message the other way:
handle.postMessage({ type: "shutdown" });

// Tear down when done:
handle.dispose();
```

### How isolation works

- **`sandbox="allow-scripts"`** — unique origin; no forms, popups, top-navigation, or same-origin access. Widen via `sandboxAttrs` only when the agent UI legitimately needs one of those capabilities.
- **CSP meta** injected into the iframe's srcdoc. The default policy is `default-src 'none'` with `script-src` allowing inline + every origin from your `importMap`. Override with `cspDirectives`.
- **`srcdoc`, not `src=`** — the iframe starts as a blank document that we write. No network navigation.
- **postMessage bridge** is `__whisq`-tagged so other frames on the page can't spoof messages into your `onMessage` callback; parent messages arrive as a `whisq:parent` `CustomEvent` on the iframe-side `window`.

### When to use which

| You want to… | Reach for |
|---|---|
| Evaluate a bit of JS, get a return value | `createSandbox().execute(code)` |
| Mount AI-generated UI that shouldn't see your host DOM | `mountSandboxed({ source, container })` |

## Documentation

Full documentation at [whisq.dev](https://whisq.dev).

## License

MIT
