# Releasing

Releases are automated via [release-please](https://github.com/googleapis/release-please).
No manual `lerna version` runs and no direct pushes to `main` are required.

## How it works

1. Every push to `main` triggers `.github/workflows/release-please.yml`.
2. release-please scans conventional commits since the last release and either
   opens a new "chore: release …" PR or updates the existing one with the next
   version, regenerated `CHANGELOG.md`, and bumped `package.json` / `lerna.json`
   versions across all files listed in `release-please-config.json`.
3. When a maintainer merges that Release PR, release-please creates the matching
   `vX.Y.Z` git tag and a GitHub Release. The merge commit (a push to `main`)
   re-runs `release-please.yml`. Because `release-please` outputs
   `releases_created: true` on this run, the chained `test`, `e2e`, and
   `publish` jobs in the same workflow execute.
4. The `publish` job runs `npm run publish -- from-package --yes` (which calls
   `lerna publish from-package`), gated by the `publish` GitHub Environment
   (manual approval, branch-restricted to `main`) and authenticated to npm via
   Trusted Publishing (OIDC). npm-provenance is enabled via
   `NPM_CONFIG_PROVENANCE=true`.

All publishable packages share one version because the config runs release-please
in **single-component mode**: a single root entry in `packages` with an
`extra-files` list that enumerates every workspace `package.json`'s `$.version`
JSONPath. release-please rewrites each path with the new version on every
release PR.

Internal cross-workspace dependency ranges (e.g. `@grafana/faro-web-tracing`
depending on `@grafana/faro-web-sdk`) stay in sync by the same mechanism — each
range is listed explicitly in `extra-files`.

## Packages excluded from npm publish

Two workspaces are tracked by `extra-files` (so their versions and internal-dep
ranges stay in sync with the publishable packages) but are **never published**:

- `demo/` (`@grafana/faro-demo`)
- `e2e/smoke/` (`@grafana/faro-smoke-harness`)

Both are private (`"private": true` in their `package.json`). `lerna publish`
skips private packages regardless of subcommand, and `npm publish` would refuse
them outright.

The legacy directories under `experimental/` (`instrumentation-fetch`,
`instrumentation-xhr`, `instrumentation-performance-timeline`, `nextjs`, `vue`)
have no `package.json` and are unmaintained. They are not part of the workspace
set and are ignored.

## Triggering a release

Land a PR with a conventional commit prefix:

- `feat:` → minor bump
- `fix:` → patch bump
- `feat!:` / `fix!:` / `BREAKING CHANGE:` footer → major bump
- `chore:`, `docs:`, `refactor:`, etc. → no version bump

The Release PR will appear (or update) within a few minutes of the merge to `main`.
Review and merge it when you're ready to ship.

## Configuration

- `release-please-config.json` — package list, plugins, changelog path.
- `.release-please-manifest.json` — current versions per package (managed by the bot;
  do not hand-edit unless recovering from a broken state).
- `.github/workflows/release-please.yml` — the workflow itself.

## Skipping a release

If you want to merge changes without ever publishing them, use commit types that
don't trigger a bump (`chore:`, `docs:`, `refactor:`, `test:`, etc.) or annotate
the message with `Release-As: <version>` to override.
