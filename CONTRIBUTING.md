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

The branch flow is strict: `feature → develop → release/v<version> → main → back-merge → develop`. No package.json editing by hand; two workflows do all the mechanical work.

1. Your PR merges to `develop` with its changeset attached.
2. When enough changesets have accumulated, a maintainer opens **Actions → Release — prepare → Run workflow**. That creates a `release/v<version>` branch, bumps every `package.json`, writes CHANGELOGs, and opens a PR to `main`.
3. A maintainer reviews the release PR and squash-merges it into `main`.
4. The merge triggers **`release.yml`**, which publishes all bumped packages to npm with provenance, creates per-package git tags and GitHub Releases, and opens a back-merge PR.
5. A maintainer squash-merges the back-merge PR into `develop`.

Full details in [`docs/RELEASING.md`](./docs/RELEASING.md).

## License

By contributing, you agree that your contributions will be licensed under the [MIT License](LICENSE).
