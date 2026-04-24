---
"@whisq/core": minor
---

Friendly runtime errors for sub-path exports imported from the main `@whisq/core` path.

Apps of any size reach into multiple sub-path imports: `@whisq/core/persistence`, `/ids`, `/collections`, `/forms`. This is the right shape for tree-shaking — unused sub-paths add zero bytes — but an AI or human writing `import { partition } from "@whisq/core"` used to hit the generic bundler "not exported" error with no hint about where the symbol actually lives.

The main entry now re-exports these sub-path names as runtime stubs. Importing one compiles cleanly; calling it throws with a message that names the correct sub-path and links to the docs page:

```ts
import { partition } from "@whisq/core";      // compiles
const [a, b] = partition(() => xs.value, p);  // → Error("partition" is not exported from "@whisq/core". Import it from "@whisq/core/collections" instead. See https://whisq.dev/api/partition/)
```

Each stub carries `@deprecated` JSDoc so editor hover surfaces the correct sub-path without running the code.

Symbols covered:

- `partition`, `signalMap`, `signalSet` → `@whisq/core/collections`
- `randomId` → `@whisq/core/ids`
- `persistedSignal` → `@whisq/core/persistence`
- `bindPath` → `@whisq/core/forms`

Stubs are plain `export function`s in a side-effect-free module; bundlers with standard unused-export elimination (esbuild, Rollup, Vite) drop them to zero bytes in apps that don't import them. Verified by building a minimal `import { signal }` app: the produced bundle contains no stub names, no error strings, and no sub-path-stubs module reference.

Closes WHISQ-133.
