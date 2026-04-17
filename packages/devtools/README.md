# @whisq/devtools

DevTools runtime hook for Whisq — signal inspection, component tree, effect tracking.

## Install

```bash
npm install @whisq/devtools
```

## Usage

```ts
import { connectDevTools } from "@whisq/devtools";

// Call before mount() to enable DevTools in development
if (import.meta.env.DEV) {
  connectDevTools();
}
```

Open the Whisq panel in your browser DevTools to inspect signals, the component tree, and active effects.

## Documentation

Full documentation at [whisq.dev](https://whisq.dev).

## License

MIT
