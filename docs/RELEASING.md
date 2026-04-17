# Releasing Whisq

> How to publish new versions of Whisq packages to npm.

---

## Prerequisites

1. **npm account** with access to the `@whisq` scope
2. **NPM_TOKEN** secret configured in the GitHub repository
3. **2FA enabled** on the npm account
4. You're on the `develop` branch with a clean working tree

## Release Flow

### 1. Create a Changeset

During development, create changesets to describe your changes:

```bash
pnpm changeset
```

Select the packages you changed and the semver bump type:

- **patch** — bug fixes, docs changes
- **minor** — new features, additive API changes
- **major** — breaking changes (only for v2.0+)

This creates a file in `.changeset/` that describes the change.

### 2. Version Packages

When ready to release, apply all pending changesets:

```bash
pnpm version
```

This:

- Bumps all package versions according to changesets
- Generates/updates CHANGELOG.md in each package
- Removes consumed changeset files

### 3. Commit and Push

```bash
git add .
git commit -m "chore: release v0.0.1-alpha.1"
git push
```

### 4. Create a Release Tag

```bash
git tag v0.0.1-alpha.1
git push --tags
```

### 5. Automated Publish

Pushing a `v*` tag triggers the release workflow (`.github/workflows/release.yml`) which:

1. Runs the full CI pipeline (lint, typecheck, test, build)
2. Publishes all packages to npm with `--provenance`
3. Creates a GitHub Release with auto-generated release notes

### 6. Verify

After the workflow completes:

```bash
# Check packages are on npm
npm view @whisq/core version
npm view @whisq/router version

# Test install in a fresh project
mkdir /tmp/test-whisq && cd /tmp/test-whisq
npm init -y
npm install @whisq/core

# Test create-whisq
npm create whisq@latest test-app
```

## Pre-release Versions

For alpha/beta releases, the tag name determines the pre-release label:

- `v0.0.1-alpha.1` → publishes as alpha
- `v0.0.1-beta.1` → publishes as beta
- `v0.0.1-rc.1` → publishes as release candidate

The GitHub Release will automatically be marked as "pre-release".

## Manual Publish (Emergency)

If the CI pipeline fails and you need to publish manually:

```bash
pnpm build
pnpm test
pnpm -r publish --access public --no-git-checks
```

Requires `NPM_TOKEN` in your environment or `npm login` with 2FA.

## Troubleshooting

| Issue                           | Solution                                                        |
| ------------------------------- | --------------------------------------------------------------- |
| `403 Forbidden` on publish      | Check NPM_TOKEN is valid and has publish access to @whisq scope |
| Provenance error                | Ensure `id-token: write` permission in workflow                 |
| Package not found after publish | Wait 1-2 minutes for npm registry to propagate                  |
| Version conflict                | Run `pnpm version` to consume changesets, then commit           |
