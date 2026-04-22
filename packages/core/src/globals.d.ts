// Minimal ambient declaration so dev-mode guards
// (`if (process.env.NODE_ENV !== "production") { ... }`) type-check without
// pulling in @types/node. The literal `process.env.NODE_ENV` reference at
// every guard site lets bundlers (Vite, Rollup, webpack, esbuild) replace it
// and dead-code-strip the development branch in production builds.
declare const process: { env: { NODE_ENV?: string } };
