# Releasing Whisq

> How Whisq publishes new versions. The short version: you merge a changeset, click "Run workflow" on _Release — prepare_, review and merge the resulting release PR into `main`, then merge the back-merge PR into `develop`. Two clicks.

---

## The branch flow

```
feature/*  →  develop  →  release/v<version>  →  main  →  (back-merge)  →  develop
```

- **`feature/*` / `bugfix/*` / `chore/*`** branches → PR to `develop` (every PR carries a changeset or the `skip-changeset` label)
- **`develop`** accumulates merged changesets
- **`release/v<version>`** is cut from `develop` by the _Release — prepare_ workflow when you want to ship
- **`main`** is production: merging the release PR here triggers npm publish
- **Back-merge PR** from `main` → `develop` brings the version bumps home

Nobody edits `package.json` versions by hand. The workflows do it.

## Day-to-day: add a changeset to every PR

```bash
pnpm changeset
```

Answer the prompts. Commit the generated `.changeset/<slug>.md` alongside your code. We're in **alpha pre mode** (`.changeset/pre.json` is present), so any bump resolves as `0.1.0-alpha.N → 0.1.0-alpha.N+1`.

The `changeset-check` workflow fails PRs without a changeset unless they carry the `skip-changeset` label (docs, repo tooling, dep bumps with no API impact).

## Cutting a release

### 1. Open _Release — prepare_

**Actions → Release — prepare → Run workflow** (on `develop`).

It:

- verifies there's at least one pending changeset on `develop`
- runs `pnpm run version` (applies all pending changesets, bumps every affected `package.json`, writes CHANGELOG entries, syncs create-whisq templates)
- creates a `release/v<new-version>` branch with a single "chore: release v<version>" commit
- opens a PR from that branch into `main`

### 2. Review and merge the release PR into `main`

The PR body shows the version bumps and each package's CHANGELOG diff. If something looks wrong, close the PR and the release branch; your pending changesets on `develop` are untouched. If it looks right, **use a merge commit (not squash)** — `main` keeps the full history of every feature that made it into the release.

### 3. Automated publish

Merging to `main` triggers `.github/workflows/release.yml`:

- re-runs build + test + version-consistency + bundle-size
- runs `pnpm run release` via `changesets/action` — publishes every bumped package to npm with `--provenance`, creates per-package git tags (`@whisq/core@<version>` etc.), and creates a GitHub Release per tag with auto-generated notes
- opens a back-merge PR from `main` into `develop`

### 4. Merge the back-merge PR into `develop`

Title: `chore: back-merge main → develop after v<version>`. Carries the `skip-changeset` label. **Squash-merge** it so `develop` gets a single "back-merge" commit — `develop` stays clean and linear at one commit per merged PR.

## Merge style per branch

Whisq deliberately uses different merge styles for `develop` and `main`:

| Target                                                             | Style            | Why                                                                                                                                      |
| ------------------------------------------------------------------ | ---------------- | ---------------------------------------------------------------------------------------------------------------------------------------- |
| PRs into `develop` (all PRs — features, fixes, chore, back-merges) | **Squash**       | Each PR collapses into a single commit on `develop` — clean, linear, easy to scan.                                                       |
| PRs into `main` (release PRs only)                                 | **Merge commit** | Preserves the history of every feature that made it into the release, so `git log main` shows every squashed PR as an individual commit. |

This is convention, not enforced by GitHub — pick the right option from the dropdown on the green merge button.

## One-time setup (already done, documented for future maintainers)

### `WHISQ_BOT` GitHub App

Both release workflows use a `WHISQ_BOT` app installation token because the runner's default `GITHUB_TOKEN` is blocked at the enterprise level from creating pull requests.

- **Secrets** on `whisqjs/whisq`: `WHISQ_BOT_APP_ID`, `WHISQ_BOT_PRIVATE_KEY`
- **App permissions** on `whisqjs/whisq`: Contents R/W, Pull requests R/W, Metadata R
- **Repository access**: `whisq` must be in the app's selected repositories

Grant/re-grant via github.com/organizations/whisqjs/settings/installations → WHISQ_BOT → Configure.

### Allowed third-party actions

`changesets/action@*` and `pnpm/action-setup@*` are allowed via Settings → Actions → General → Allow select actions. `actions/create-github-app-token` is GitHub-owned so it's allowed by default.

### Branch protection

- `main`: PR required, all CI checks, conversation resolution, no force-push, no deletion.
- `develop`: PR required, all CI checks, no force-push, no deletion.
- The WHISQ_BOT app can push feature-like branches (`release/*`, `chore/backmerge-*`) but cannot push directly to `main` or `develop` — that's why everything happens through PRs.

## Exiting pre mode

When the API is stable enough to drop `-alpha`:

```bash
pnpm changeset pre exit
```

Commit the deletion of `.changeset/pre.json` on a feature branch, PR to develop, merge. After that, the next _Release — prepare_ will produce a normal semver version (e.g. `0.1.0`).

## Emergency manual override

Both release workflows also accept `workflow_dispatch`. If the automation is broken entirely:

```bash
# On a release/v<version> branch checked out locally, with no pending changesets:
pnpm install --frozen-lockfile
pnpm build
pnpm test
pnpm -r publish --access public --no-git-checks --provenance
```

Requires `NPM_TOKEN` in your environment or `npm login` with 2FA.

## Verifying a release

```bash
npm view @whisq/core version
npm view create-whisq version

# Fresh-install sanity:
mkdir /tmp/whisq-sanity && cd /tmp/whisq-sanity
npm init -y
npm install @whisq/core
```

## Troubleshooting

| Symptom                                                                         | Likely cause                                                 | Fix                                                                                                                                                  |
| ------------------------------------------------------------------------------- | ------------------------------------------------------------ | ---------------------------------------------------------------------------------------------------------------------------------------------------- |
| _Release — prepare_ errors with "No pending changesets on develop"              | No `.changeset/*.md` accumulated since last release          | Merge a PR that adds a changeset, or run `pnpm changeset` on a throwaway branch first                                                                |
| Release workflow `startup_failure`                                              | New third-party action not allowlisted                       | Add to Settings → Actions → General → Allow select actions                                                                                           |
| `HttpError: GitHub Actions is not permitted to create or approve pull requests` | Using runner's `GITHUB_TOKEN` instead of the app token       | Ensure `GITHUB_TOKEN: ${{ steps.app-token.outputs.token }}` on all PR-creating steps                                                                 |
| `Resource not accessible by integration`                                        | WHISQ_BOT app lacks `pull_requests:write` on this repo       | Re-grant the permission in the app's installation settings                                                                                           |
| `403 Forbidden` on publish                                                      | `NPM_TOKEN` expired or revoked                               | Rotate the secret                                                                                                                                    |
| `Package size limit has exceeded` on release run                                | A merged feature pushed `@whisq/core` past 5 KB gzipped      | Move the added code behind a sub-path export (like `@whisq/core/collections`), or bump the limit in `packages/core/package.json` `size-limit` config |
| Tag already exists for a version we tried to republish                          | Prior run partially succeeded                                | Delete the stale tag on GitHub or move on — npm publish is idempotent per-version                                                                    |
| `pnpm version` runs Node's version dump instead of the script                   | Never invoke `pnpm version` directly; use `pnpm run version` | Already baked into the release workflow                                                                                                              |
