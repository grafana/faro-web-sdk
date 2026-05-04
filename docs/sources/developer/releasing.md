# Releasing

Releases are automated via [release-please](https://github.com/googleapis/release-please).
No manual `lerna version` runs and no direct pushes to `main` are required.

## How it works

1. Every push to `main` triggers `.github/workflows/release-please.yml`.
2. release-please scans conventional commits since the last release and either:
   - opens a new "Release please" PR, or
   - updates an existing one with the next version, regenerated CHANGELOG entries,
     and bumped `package.json` / `lerna.json` versions across all publishable packages.
3. When a maintainer merges that Release PR, release-please creates the matching
   `vX.Y.Z` git tag and a GitHub Release.
4. The tag push triggers `.github/workflows/release.yml`, which runs the existing
   test/e2e pipeline and publishes to npm via `lerna publish from-git` with provenance.

All 6 publishable packages bump together (lockstep) via the `linked-versions`
plugin in `release-please-config.json`.

## Packages excluded from release-please

The `demo/` workspace (`@grafana/faro-demo`) is **intentionally not listed** in
`release-please-config.json` or `.release-please-manifest.json`. It is a private
package (`"private": true` in `demo/package.json`) used only for local
development and end-to-end tests; it is never published to npm.

Demo's internal dependency ranges (e.g. on `@grafana/faro-web-sdk`) are still
kept in sync automatically by the `node-workspace` plugin during every release
bump, so the demo continues to build against the latest local versions.

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
