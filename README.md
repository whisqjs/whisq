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

## Why Whisq?

- **Under 5 KB gzipped** — the complete framework
- **Zero build step** — runs as plain JavaScript, works with any bundler
- **AI-native** — entire API fits in under 5,000 tokens. AI gets it right the first time.
- **100% TypeScript** — every element function is fully typed

## Get Started

```bash
npm create whisq@latest my-app
cd my-app
npm install
npm run dev
```

Four templates available: `minimal`, `full-app` (router + pages + store), `ssr`, `vite-plugin` (file-based routing).

## Core API

```ts
// State
signal(value)              // reactive value
computed(fn)               // derived value
effect(fn)                 // side effect (returns dispose)
batch(fn)                  // batch multiple updates

// Elements — every HTML tag is a function
div(props?, ...children)
button(props?, ...children)
input(props?)
h1(), h2(), p(), span(), ul(), li(), a(), img(), form(), ...

// Rendering
when(condition, then, else) // conditional rendering
each(items, renderFn)       // list rendering
raw(htmlString)             // raw HTML (trusted content only)
mount(node, element)        // mount to DOM (returns dispose)

// Components
component(setupFn)         // function component
onMount(fn)                // lifecycle — runs after mount
onCleanup(fn)              // lifecycle — runs on unmount
resource(fetchFn)          // async data loading

// Styling
sheet(rules)               // scoped CSS-in-JS
theme(tokens)              // design tokens as CSS custom properties
```

## Packages

| Package                                      | Description                                  | Size   |
| -------------------------------------------- | -------------------------------------------- | ------ |
| [`@whisq/core`](packages/core)               | Signals, elements, components, styling       | 4.2 KB |
| [`@whisq/router`](packages/router)           | Signal-based client-side routing             | 2.7 KB |
| [`@whisq/ssr`](packages/ssr)                 | Server-side rendering + streaming            | 1.0 KB |
| [`@whisq/testing`](packages/testing)         | Render, query, fireEvent, userEvent, waitFor | —      |
| [`@whisq/vite-plugin`](packages/vite-plugin) | File-based routing, HMR, code splitting      | —      |
| [`@whisq/mcp-server`](packages/mcp-server)   | AI tool integration (MCP protocol)           | —      |
| [`@whisq/devtools`](packages/devtools)       | Signal inspection and component viewer       | —      |
| [`@whisq/sandbox`](packages/sandbox)         | Isolated code execution                      | —      |
| [`create-whisq`](packages/create-whisq)      | Project scaffolding CLI                      | —      |

## AI Integration

Whisq is designed for AI-assisted development:

- **MCP Server** — `@whisq/mcp-server` provides scaffold, validate, query API, and analyze tools
- **Small API surface** — the entire framework fits in <5% of a 200K context window
- **No footguns** — uniform `() => value` pattern, no hooks rules, no reactivity caveats

### Entry points for AI assistants

Point Claude, ChatGPT, Gemini, Cursor, or any coding assistant at these URLs before it writes Whisq code:

- **Compact LLM reference card:** <https://whisq.dev/ai/llm-reference/> — the whole framework in one page
- **Machine-readable exports manifest:** <https://unpkg.com/@whisq/core@latest/dist/public-api.json> — every named export in the current release, pinned per version
- **Copy-paste test prompts:** [`docs/AI_TEST_PROMPTS.md`](./docs/AI_TEST_PROMPTS.md) — eight self-contained prompts (todo, signup form, chat UI, markdown editor, live dashboard, router SPA, SSR blog, Snake) that exercise different surfaces of the framework

> **Coming soon:** `whisq.dev/llms.txt` (structured index, [llmstxt.org](https://llmstxt.org) convention) and `whisq.dev/llms-full.txt` (full docs as one plain-text fetch) are merged to docs `develop` and will go live once the docs repo cuts its next release.

## Documentation

- [Getting Started](https://whisq.dev/getting-started/introduction/) — installation, quick start, first component
- [Core Concepts](https://whisq.dev/core-concepts/signals/) — signals, elements, components, styling
- [API Reference](https://whisq.dev/api/signal/) — complete API docs
- [Guides](https://whisq.dev/guides/routing/) — routing, SSR, forms, testing, data fetching
- [Examples](https://whisq.dev/examples/counter/) — counter, todo, dashboard, forms
- [Playground](https://whisq.dev/playground/) — try Whisq in the browser

## Contributing

See [CONTRIBUTING.md](CONTRIBUTING.md) for guidelines. Bug reports and docs fixes are welcome. Code PRs by invitation during alpha.

## License

[MIT](LICENSE) — Markot s.r.o.
