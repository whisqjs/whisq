<p align="center">
  <img src="https://raw.githubusercontent.com/whisqjs/whisq/develop/docs/brand/mascot.png" alt="Whisq mascot" width="120" />
  <br />
  <picture>
    <source media="(prefers-color-scheme: dark)" srcset="https://raw.githubusercontent.com/whisqjs/whisq/develop/docs/brand/wordmark-dark-bg.svg" />
    <source media="(prefers-color-scheme: light)" srcset="https://raw.githubusercontent.com/whisqjs/whisq/develop/docs/brand/wordmark-light-bg.svg" />
    <img src="https://raw.githubusercontent.com/whisqjs/whisq/develop/docs/brand/wordmark-dark-bg.svg" alt="whisq" height="36" />
  </picture>
</p>

<p align="center">
  <strong>The AI-native UI framework.</strong> Signals for state. Functions for UI. That's it.
</p>

```ts
import {
  signal,
  computed,
  component,
  div,
  button,
  span,
  mount,
} from "@whisq/core";

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

## Get Started

```bash
npm create whisq@latest my-app
cd my-app
npm run dev
```

## Packages

| Package                                                  | Description                                       |
| -------------------------------------------------------- | ------------------------------------------------- |
| [`@whisq/core`](https://github.com/whisqjs/whisq)        | Signals, elements, components, lifecycle, styling |
| [`@whisq/router`](https://github.com/whisqjs/whisq)      | Signal-based client-side routing                  |
| [`@whisq/ssr`](https://github.com/whisqjs/whisq)         | Server-side rendering with hydration              |
| [`@whisq/testing`](https://github.com/whisqjs/whisq)     | Component testing — render, query, fire events    |
| [`@whisq/devtools`](https://github.com/whisqjs/whisq)    | Signal inspection and component tree viewer       |
| [`@whisq/vite-plugin`](https://github.com/whisqjs/whisq) | File-based routing, HMR, optimized builds         |
| [`@whisq/mcp-server`](https://github.com/whisqjs/whisq)  | AI tool integration via Model Context Protocol    |
| [`@whisq/sandbox`](https://github.com/whisqjs/whisq)     | Isolated code execution for playgrounds           |
| [`create-whisq`](https://github.com/whisqjs/whisq)       | Project scaffolding CLI                           |

## Why Whisq?

- **Under 5KB gzipped** — the complete framework
- **Zero build step** — runs as plain JavaScript, works with any bundler
- **AI-native** — entire API fits in under 5,000 tokens. AI gets it right the first time.
- **100% TypeScript** — every element function is fully typed

## Links

- [Documentation](https://whisq.dev) — Guides, API reference, examples
- [GitHub](https://github.com/whisqjs/whisq) — Source code and issues
- [Quick Start](https://whisq.dev/getting-started/quick-start/) — From zero to running app

---

Whisqed by [Markot s.r.o.](https://markot.dev)
