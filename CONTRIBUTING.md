# Contributing to Whisq

Thank you for your interest in Whisq! Here's how you can help.

## Reporting Bugs

Found a bug? [Open an issue](https://github.com/whisqjs/whisq/issues/new?template=bug_report.md) with:

- What you expected to happen
- What actually happened
- Steps to reproduce
- Your environment (browser, Node.js version, OS)

## Requesting Features

Have an idea? [Open a feature request](https://github.com/whisqjs/whisq/issues/new?template=feature_request.md). We'd love to hear what you need.

## Documentation Fixes

Typos, unclear explanations, broken links — PRs for docs fixes are always welcome. Just fork, fix, and open a PR.

## Code Contributions

Whisq is in early alpha. The core architecture is still evolving, so we're **not accepting unsolicited code PRs** at this time. This helps us:

- Keep the API surface intentional
- Avoid breaking contributors' work during refactors
- Move fast without PR review bottleneck

If you'd like to contribute code, [open an issue](https://github.com/whisqjs/whisq/issues) first to discuss the approach. We'll invite PRs for specific issues when ready.

## Development Setup

```bash
git clone https://github.com/whisqjs/whisq.git
cd whisq
pnpm install
pnpm build
pnpm test
```

**Requirements:** Node.js >= 20, pnpm 9.15.0

**Key commands:**

| Command               | Description                     |
| --------------------- | ------------------------------- |
| `pnpm build`          | Build all packages              |
| `pnpm test`           | Run all tests                   |
| `pnpm format`         | Format with Prettier            |
| `pnpm format --check` | Check formatting (CI uses this) |

## Code Style

- TypeScript strict mode
- Prettier defaults (no config file)
- ESM only
- No runtime dependencies in `@whisq/core`
- Functional style — no classes, no `this`

## Commit Messages

```
WHISQ-<issue#>: <short description>
```

## License

By contributing, you agree that your contributions will be licensed under the [MIT License](LICENSE).
