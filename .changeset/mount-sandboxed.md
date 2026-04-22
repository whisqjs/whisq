---
"@whisq/sandbox": minor
---

Add `mountSandboxed()` — render AI-generated (or otherwise untrusted) Whisq source into an isolated iframe on the current page. Complements the existing `createSandbox()` primitive (which evaluates code and returns a value) by covering the rendering-isolation use case that ArrowJS's WASM sandbox is known for — without the WASM cost.

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

handle.postMessage({ type: "shutdown" });
handle.dispose();
```

Isolation is standards-only:

- `<iframe sandbox="allow-scripts">` — unique origin; no same-origin access, no forms, no popups, no top-navigation.
- `<meta http-equiv="Content-Security-Policy">` in the iframe's srcdoc — default policy is `default-src 'none'` with `script-src` allowing inline + origins from your `importMap`; override via `cspDirectives`.
- `srcdoc` rather than `src=` — no network navigation; the iframe is a blank document we write into.
- `__whisq`-tagged postMessage bridge — other frames can't spoof messages into the parent's `onMessage` callback. Parent-to-iframe messages arrive as a `whisq:parent` `CustomEvent` on the iframe-side `window`.
- `</script>` and HTML comment closers inside the user source are escaped to prevent srcdoc injection.

API shape is deliberately scaffolded so future `isolation: "worker"` / `isolation: "wasm"` backends can land without a breaking change.

Closes WHISQ-118.
