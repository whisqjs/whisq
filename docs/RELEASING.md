# Releasing Whisq

> How Whisq publishes new versions to npm. The short version: you don't. Merging changesets into `develop` does it for you.

---

## Day-to-day: add a changeset to every PR

Every PR that changes code users can observe in `node_modules/@whisq/*` must include a changeset. The `changeset-check` workflow fails PRs that forget one (bypass with the `skip-changeset` label for docs, repo tooling, or no-op dep bumps).

```bash
pnpm changeset
```

Answer the prompts — which packages changed, and whether the change is `patch` / `minor` / `major`. We're currently in **alpha pre mode** (`.changeset/pre.json` is present), so any bump becomes `0.1.0-alpha.N → 0.1.0-alpha.N+1`. The tool writes a small `.changeset/<slug>.md` file. Commit it alongside your code.

## What happens after merge to `develop`

The Release workflow (`.github/workflows/release.yml`) runs on every push to `develop`:

1. **If there are pending changeset files**, it opens (or updates) a PR titled **"chore: release packages"**. This PR shows the version bumps and CHANGELOG entries that will ship. Nothing has been published yet.
2. **If the release PR just got merged** (so the push contains version-bumped `package.json` files and consumed changesets are gone), it runs `pnpm release` which:
   - publishes each bumped package to npm with `--provenance`,
   - creates a git tag per package,
   - creates a GitHub Release for `@whisq/core` with auto-generated notes.

So the entire human workflow is: write code, run `pnpm changeset`, commit, open PR, merge. Later, review and merge the auto-opened release PR.

## One-time setup (already done, documented here so future maintainers can reproduce)

### `WHISQ_BOT` GitHub App

The enterprise policy blocks the runner's built-in `GITHUB_TOKEN` from creating pull requests. The Release workflow uses the `WHISQ_BOT` installation token instead. This requires:

- **Secrets** on `whisqjs/whisq`:
  - `WHISQ_BOT_APP_ID`
  - `WHISQ_BOT_PRIVATE_KEY`
- **App permissions** on `whisqjs/whisq`:
  - Contents: **Read & Write**
  - Pull requests: **Read & Write**
  - Metadata: **Read**

To (re)grant those permissions: go to github.com/organizations/whisqjs/settings/installations, find the WHISQ_BOT app, ensure `whisq` is in the selected repos, and confirm the three scopes above.

### Allowed third-party actions

`changesets/action@*` and `pnpm/action-setup@*` are allowed via `Settings → Actions → General → Allow select actions and reusable workflows`. `actions/create-github-app-token` is GitHub-owned so it's allowed by default.

### Branch protection on `develop`

Requires PR, all 6 CI checks, no force-push, no deletion. The WHISQ_BOT app is **not** an admin — it cannot push directly to `develop`. That's why we use the release-PR flow (the PR goes through normal merge, not a direct push).

## Exiting pre mode

When ready to cut a `0.1.0` stable:

```bash
pnpm changeset pre exit
```

Commit the deleted `.changeset/pre.json` in a PR. After that, bumps resolve as normal semver — the next release will be `0.1.0`, then `0.1.1` / `0.2.0` / etc.

## Emergency manual override

If the automation is broken (e.g. npm outage, bad app token, enterprise policy change), re-run via `workflow_dispatch` on the Release workflow. If that also fails:

```bash
# On develop, with a clean working tree and no pending changesets:
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

# Fresh install sanity check:
mkdir /tmp/whisq-sanity && cd /tmp/whisq-sanity
npm init -y
npm install @whisq/core
```

## Troubleshooting

| Symptom                                                                         | Likely cause                                           | Fix                                                                                            |
| ------------------------------------------------------------------------------- | ------------------------------------------------------ | ---------------------------------------------------------------------------------------------- |
| Release workflow `startup_failure`                                              | New third-party action not allowlisted                 | Add to `Settings → Actions → General → Allow select actions`                                   |
| `HttpError: GitHub Actions is not permitted to create or approve pull requests` | Using runner's `GITHUB_TOKEN` instead of the app token | Ensure `GITHUB_TOKEN: ${{ steps.app-token.outputs.token }}` is on the `changesets/action` step |
| `Resource not accessible by integration`                                        | WHISQ_BOT app lacks `pull_requests:write` on this repo | Re-grant the permission in the app's installation settings                                     |
| `403 Forbidden` on publish                                                      | `NPM_TOKEN` expired or revoked                         | Rotate the secret                                                                              |
| Provenance error                                                                | Missing `id-token: write` permission                   | Already set at the workflow level                                                              |
| Tag already exists                                                              | Release was re-run after a partial success             | Delete the tag on GitHub if it's wrong, or move on — publishing is idempotent per-version      |
| Version conflict between packages                                               | Someone hand-edited `package.json`                     | `node scripts/check-versions.mjs` to diagnose; re-run `pnpm version` after fixing              |
