# @whisq/ssr

Server-side rendering for Whisq applications.

## Install

```bash
npm install @whisq/ssr
```

## Usage

```ts
import { renderToString } from "@whisq/ssr";
import { div, h1, p } from "@whisq/core";

const App = div(
  h1("Hello from the server"),
  p("This page was server-rendered."),
);

const html = await renderToString(App);
// Send `html` in your HTTP response
```

## Documentation

Full documentation at [whisq.dev](https://whisq.dev).

## License

MIT
