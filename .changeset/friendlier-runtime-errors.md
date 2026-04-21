---
"@whisq/core": minor
---

Dev-mode runtime errors now tell you what's wrong and how to fix it. `div(...)`, `each()`, and `component()` validate their inputs at the boundary and throw a new `WhisqStructureError` with an expected/received mismatch plus a short hint when malformed children, non-array `each()` items, or invalid component return values show up.

Where the old behaviors were "`Uncaught TypeError: .for is not iterable`" or a silent drop, you now see:

```
each: expected items() to return an array, received undefined.
Hint: Data hasn't loaded yet. Gate the list with `when(() => data(), () => ul(each(...)))` or return `[]` while loading.
```

The guard code is wrapped in `if (process.env.NODE_ENV !== "production")` blocks so bundlers (Vite, Rollup, webpack, esbuild) strip it from production bundles — `@whisq/core` size-limit is measured with the same define and stays under budget at 5.25 KB gzipped.

Public surface: `WhisqStructureError` (class) and `WhisqStructureErrorFields` (type) are both exported so apps can `instanceof`-check and render friendly error boundaries.

Closes #81.
