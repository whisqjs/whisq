<p align="center">
  <img src="docs/brand/mascot.png" alt="Whisq mascot" width="160" />
  <br />
  <picture>
    <source media="(prefers-color-scheme: dark)" srcset="docs/brand/wordmark-dark-bg.svg" />
    <source media="(prefers-color-scheme: light)" srcset="docs/brand/wordmark-light-bg.svg" />
    <img src="docs/brand/wordmark-dark-bg.svg" alt="whisq" height="40" />
  </picture>
</p>

<p align="center">
  <strong>The AI-native JavaScript framework.</strong> Signals for state. Functions for UI. That's it.
</p>

<p align="center">
  <a href="https://github.com/whisqjs/whisq/actions"><img src="https://img.shields.io/github/actions/workflow/status/whisqjs/whisq/ci.yml?branch=develop&label=CI" alt="CI"></a>
  <a href="https://www.npmjs.com/package/@whisq/core"><img src="https://img.shields.io/npm/v/@whisq/core?color=4F46E5" alt="npm"></a>
  <a href="LICENSE"><img src="https://img.shields.io/badge/license-MIT-5CE0F2" alt="License"></a>
</p>

Whisq is designed so large language models produce working code on the first try. The complete framework is ~5 KB gzipped and the full API fits in a prompt. No hooks rules. No reactivity caveats. No compile-time magic — just signals for state, functions for UI.

```ts
import { signal, component, div, button, span, mount } from "@whisq/core";

const App = component(() => {
  const count = signal(0);
  return div(
    button(
      { onclick: () => count.value++ },
      span(() => `Clicked ${count.value} times`),
    ),
  );
});

mount(App({}), document.getElementById("app")!);
```

## For AI assistants

Point Claude, Cursor, Copilot, or any coding assistant at one of these before it writes Whisq:

- **[`whisq.dev/llms.txt`](https://whisq.dev/llms.txt)** — structured site index per the [llmstxt.org](https://llmstxt.org) convention.
- **[`whisq.dev/llms-full.txt`](https://whisq.dev/llms-full.txt)** — every docs page concatenated into one plain-text fetch (~165 KB, 66 pages).
- **[`whisq.dev/ai/llm-reference`](https://whisq.dev/ai/llm-reference/)** — compact reference card: the whole framework in one page, two copy-paste tiers (~600 tokens minimum, ~1.7 K complete).
- **[`unpkg.com/@whisq/core@latest/dist/public-api.json`](https://unpkg.com/@whisq/core@latest/dist/public-api.json)** — machine-readable manifest of every named export, pinned per release.

Need deeper tooling? [`@whisq/mcp-server`](packages/mcp-server) exposes scaffold, validate, query-API, and analyze tools via the Model Context Protocol.

Eight copy-paste prompts that exercise different surfaces of the framework (todo, signup form, chat UI, markdown editor, live dashboard, router SPA, SSR blog, Snake) live in [`docs/AI_TEST_PROMPTS.md`](./docs/AI_TEST_PROMPTS.md).

## For humans

- **~5 KB gzipped** — complete framework (core: 5.08 KB).
- **Zero build step** — runs as plain JavaScript, works with any bundler.
- **100% TypeScript** — every element function fully typed, inferred through components.
- **One reactive wrapper** — every reactive position accepts `() => …`. No hooks rules, no dependency arrays, no stale-closure tax. ([Three read shapes inside the wrapper](packages/core/docs/access-shapes.md) — signal / keyed-each accessor / resource field.)

## Get started

```bash
npm create whisq@latest my-app
cd my-app
npm install
npm run dev
```

Four templates: `minimal`, `full-app` (router + pages + store), `ssr`, `vite-plugin` (file-based routing).

## Packages

| Package                                      | Description                                  | Size    |
| -------------------------------------------- | -------------------------------------------- | ------- |
| [`@whisq/core`](packages/core)               | Signals, elements, components, styling       | 5.08 KB |
| [`@whisq/router`](packages/router)           | Signal-based client-side routing             | 2.85 KB |
| [`@whisq/ssr`](packages/ssr)                 | Server-side rendering + streaming            | 982 B   |
| [`@whisq/testing`](packages/testing)         | Render, query, fireEvent, userEvent, waitFor | —       |
| [`@whisq/vite-plugin`](packages/vite-plugin) | File-based routing, HMR, code splitting      | —       |
| [`@whisq/mcp-server`](packages/mcp-server)   | AI tool integration (MCP protocol)           | —       |
| [`@whisq/devtools`](packages/devtools)       | Signal inspection and component viewer       | —       |
| [`@whisq/sandbox`](packages/sandbox)         | Isolated code execution                      | —       |
| [`create-whisq`](packages/create-whisq)      | Project scaffolding CLI                      | —       |

## Documentation

- **[whisq.dev](https://whisq.dev)** — full documentation site
- [Getting Started](https://whisq.dev/getting-started/introduction/) — installation, quick start, first component
- [Core Concepts](https://whisq.dev/core-concepts/signals/) — signals, elements, components, styling
- [API Reference](https://whisq.dev/api/signal/) — every named export
- [Guides](https://whisq.dev/guides/routing/) — routing, SSR, forms, data fetching, testing
- [Examples](https://whisq.dev/examples/counter/) — counter, todo, dashboard, forms
- [Playground](https://whisq.dev/playground/) — try Whisq in the browser

## Contributing

See [CONTRIBUTING.md](CONTRIBUTING.md) for guidelines. Bug reports and docs fixes are welcome. Code PRs by invitation during alpha.

## License

[MIT](LICENSE) — Markot s.r.o.
