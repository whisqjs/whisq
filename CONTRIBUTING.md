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

## Changesets & Releases

Whisq uses [Changesets](https://github.com/changesets/changesets) to automate versioning and publishing. **Every PR that changes shipped code must include a changeset.**

### Adding a changeset to your PR

From the repo root:

```bash
pnpm changeset
```

The CLI asks which packages changed and whether each change is a `patch`, `minor`, or `major` (we're currently in `alpha` pre-mode, so all bumps are prerelease bumps of `0.1.0-alpha.N`). It writes a small Markdown file in `.changeset/` — commit it alongside your code.

If your PR genuinely doesn't need a version bump (docs-only, repo tooling, internal dependency tweaks with no API impact), add the `skip-changeset` label to the PR and the check will pass.

### How the release actually cuts

1. Merging a PR with changesets into `develop` triggers the Release workflow.
2. The workflow accumulates pending changesets and opens (or updates) a PR titled **"chore: release packages"**. This PR shows the version bumps and CHANGELOG entries that would ship.
3. When you merge that release PR, the workflow runs again and this time publishes to npm + creates git tags + opens a GitHub Release.

Nothing is done by hand — no `pnpm version` / `pnpm release` locally, no manual tag pushes. If something goes wrong, `workflow_dispatch` on the Release workflow is the manual escape hatch.

## License

By contributing, you agree that your contributions will be licensed under the [MIT License](LICENSE).
