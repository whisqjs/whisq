// Size-limit config for @whisq/core. Uses a JS file (rather than the
// "size-limit" field in package.json) so we can pass a `define` to esbuild —
// this strips dev-only validators (`if (process.env.NODE_ENV !== "production")
// { ... }`) before measuring, giving a size number that matches what users'
// production bundlers will actually ship.

module.exports = [
  {
    path: "dist/index.js",
    limit: "5.5 KB",
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
