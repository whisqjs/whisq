// Size-limit config for @whisq/core. Uses a JS file (rather than the
// "size-limit" field in package.json) so we can pass a `define` to esbuild —
// this strips dev-only validators (`if (process.env.NODE_ENV !== "production")
// { ... }`) before measuring, giving a size number that matches what users'
// production bundlers will actually ship.
//
// Budget: 6.0 KB gzipped. Bumped from 5.5 → 6.0 in WHISQ-121 when
// component() gained the function-child lift (marker-pair + effect-driven
// re-render). The bump is intentional — ~150 B for closing a both-reviewer
// P1 ergonomic concern is a worthwhile trade.

module.exports = [
  {
    path: "dist/index.js",
    limit: "6.0 KB",
    gzip: true,
    modifyEsbuildConfig(config) {
      config.define = {
        ...(config.define ?? {}),
        "process.env.NODE_ENV": '"production"',
      };
      return config;
    },
  },
];
