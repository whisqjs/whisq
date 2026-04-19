# @whisq/core

The AI-native JavaScript framework — reactive signals, elements, and components.

## Install

```bash
npm install @whisq/core
```

## Usage

```ts
import { signal, div, button, span, mount } from "@whisq/core";

const count = signal(0);

const App = div(
  button({ onclick: () => count.value++ }, "Increment"),
  span(() => `Count: ${count.value}`),
);

mount(App, document.getElementById("app"));
```

## Documentation

Full documentation at [whisq.dev](https://whisq.dev).

## Public API manifest

Every published release ships a machine-readable list of exports at
`dist/public-api.json` inside the npm package. It's the source of truth
for "what `@whisq/core` exposes at this version" and is used by the
docs site to guard against silent drift in the AI reference card.

Shape:

```json
{
  "version": "0.1.0-alpha.4",
  "exports": ["Signal", "bind", "component", "mount", "..."]
}
```

Fetch it via any CDN that mirrors npm:

```
https://unpkg.com/@whisq/core@<version>/dist/public-api.json
https://cdn.jsdelivr.net/npm/@whisq/core@<version>/dist/public-api.json
```

Regenerated on every build by `scripts/generate-public-api.mjs` reading
`src/index.ts`.

## License

MIT
