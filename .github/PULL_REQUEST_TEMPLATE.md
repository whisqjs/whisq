<!--
Thanks for contributing to Whisq!

Commit/PR title format: `WHISQ-<issue#>: <short description>`
Target branch: almost always `develop` (release PRs go to `main`).
-->

## Summary

<!-- One or two sentences explaining WHAT changed and WHY. -->

## Linked issue

Closes #

## Type of change

- [ ] Bug fix (non-breaking)
- [ ] New feature (non-breaking)
- [ ] Breaking change
- [ ] Docs / chore / tooling
- [ ] Security fix

## Affected packages

<!-- Check all that apply. -->

- [ ] `@whisq/core`
- [ ] `@whisq/router`
- [ ] `@whisq/ssr`
- [ ] `@whisq/vite-plugin`
- [ ] `@whisq/testing`
- [ ] `@whisq/devtools`
- [ ] `@whisq/sandbox`
- [ ] `@whisq/mcp-server`
- [ ] `create-whisq`
- [ ] Repo tooling / CI / docs

## Changeset

- [ ] Added a changeset (`pnpm changeset`) — *required for any change to a published package*
- [ ] Not applicable (docs, CI, tooling only)

## Test plan

<!-- How did you verify this? Commands, browser checks, screenshots, etc. -->

- [ ] `pnpm test` passes
- [ ] `pnpm build` passes
- [ ] Manual verification (describe below)

## Checklist

- [ ] PR targets `develop` (or `main` only for release PRs)
- [ ] Title follows `WHISQ-<issue#>: ...` format
- [ ] No new TypeScript errors (`pnpm -r typecheck`)
- [ ] Docs updated if public API changed
