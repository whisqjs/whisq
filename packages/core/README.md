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

## License

MIT
