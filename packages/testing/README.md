# @whisq/testing

Testing utilities for Whisq components — render, screen queries, fireEvent.

## Install

```bash
npm install @whisq/testing --save-dev
```

## Usage

```ts
import { render, screen, fireEvent } from "@whisq/testing";
import { Counter } from "./Counter";

test("increments on click", async () => {
  render(Counter({ initial: 0 }));

  const button = screen.getByText("Increment");
  await fireEvent.click(button);

  expect(screen.getByText("Count: 1")).toBeTruthy();
});
```

## Documentation

Full documentation at [whisq.dev](https://whisq.dev).

## License

MIT
