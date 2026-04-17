# @whisq/sandbox

Sandboxed code execution for Whisq — isolated environment with configurable limits.

## Install

```bash
npm install @whisq/sandbox
```

## Usage

```ts
import { createSandbox } from "@whisq/sandbox";

const sandbox = createSandbox({
  timeout: 5000,
  maxMemory: "128mb",
});

const result = await sandbox.run(`
  import { signal } from "@whisq/core";
  const count = signal(0);
  count.value = 42;
  return count.value;
`);

console.log(result); // 42
```

## Documentation

Full documentation at [whisq.dev](https://whisq.dev).

## License

MIT
