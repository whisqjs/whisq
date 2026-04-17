# @whisq/vite-plugin

Vite plugin for Whisq — file-based routing, HMR, and optimized builds.

## Install

```bash
npm install @whisq/vite-plugin --save-dev
```

## Usage

```ts
// vite.config.ts
import { defineConfig } from "vite";
import whisq from "@whisq/vite-plugin";

export default defineConfig({
  plugins: [
    whisq({
      router: true, // enable file-based routing
    }),
  ],
});
```

## Documentation

Full documentation at [whisq.dev](https://whisq.dev).

## License

MIT
