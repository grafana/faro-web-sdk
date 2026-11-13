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
   `releases_created: true` on this run, the chained `test` and `publish` jobs
   in the same workflow execute.
4. The `publish` job runs `npm run publish -- from-package --yes` (which calls
   `lerna publish from-package`), gated by the `publish` GitHub Environment
   (manual approval, branch-restricted to `main`) and authenticated to npm via
   Trusted Publishing (OIDC). npm-provenance is enabled via
   `NPM_CONFIG_PROVENANCE=true`. See [Approving the publish](#approving-the-publish-two-person-rule)
   for who must approve.

While the Release PR is open, the workflow also refreshes `yarn.lock` and
re-runs formatting on the PR branch, pushing a `chore: refresh yarn.lock and
format release files` commit when needed. This commit is created through the
GitHub API (so it is signed and satisfies the verified-signatures ruleset) — it
is expected, not tampering.

All publishable packages share one version because the config runs release-please
in **single-component mode**: a single root entry in `packages` with an
`extra-files` list that enumerates every workspace `package.json`'s `$.version`
JSONPath. release-please rewrites each path with the new version on every
release PR.

Internal cross-workspace dependency ranges (e.g. `@grafana/faro-web-tracing`
depending on `@grafana/faro-web-sdk`) stay in sync by the same mechanism — each
range is listed explicitly in `extra-files`.

## Packages excluded from npm publish

The `e2e/smoke/` workspace (`@grafana/faro-smoke-harness`) is tracked by
`extra-files` (so its version stays in sync with the publishable packages) but
is **never published**. It is private (`"private": true` in its
`package.json`). `lerna publish` skips private packages regardless of
subcommand, and `npm publish` would refuse them outright.

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

## Approving the publish (two-person rule)

The `publish` job pauses on the `publish` GitHub Environment until a member of
[`@grafana/frontend-o11y`](https://github.com/orgs/grafana/teams/frontend-o11y)
approves the deployment.

**A release requires two people.** The `publish` environment has the
**Prevent self-review** protection setting enabled, so whoever merges the Release
PR (and thereby triggers the publish run) **cannot** approve it. A _different_
member of `@grafana/frontend-o11y` must approve.

To approve:

1. Open the workflow run under the repo
   [Actions tab](https://github.com/grafana/faro-web-sdk/actions/workflows/release-please.yml).
   The `publish` job shows as waiting.
2. Click **Review deployments**, select the `publish` environment, then
   **Approve and deploy**.

If you don't see the **Review deployments** button, it's almost always because
you triggered the run yourself and **Prevent self-review** is enabled — ask
another team member to approve. The CLI equivalent (for an eligible approver) is:

```sh
# Find the pending environment id:
gh api repos/grafana/faro-web-sdk/actions/runs/<run-id>/pending_deployments

# Approve it:
gh api repos/grafana/faro-web-sdk/actions/runs/<run-id>/pending_deployments \
  -f 'environment_ids[]=<env-id>' -f state=approved -f comment="ok to publish"
```

## Configuration

- `release-please-config.json` — package list, plugins, changelog path.
- `.release-please-manifest.json` — current versions per package (managed by the bot;
  do not hand-edit unless recovering from a broken state).
- `.github/workflows/release-please.yml` — the stable release workflow.
- `.github/workflows/publish-alpha.yml` — manual workflow to publish prerelease alpha builds.

## Prerelease (alpha) flow

When testing cross-package features across all linked Faro workspaces without
affecting the stable `latest` channel, releases are published on demand from a
dedicated feature branch.

### How alpha releases work

1. **Create an alpha feature branch from `main`**:

   ```sh
   git checkout -b alpha/my-feature origin/main
   git push origin alpha/my-feature
   ```

2. **Develop and merge feature PRs**: Target and merge PRs directly into
   `alpha/my-feature`. **Do not bump version numbers in git commits** — git
   history stays clean of prerelease version churn.
3. **Trigger the alpha publish workflow**: Navigate to GitHub Actions, select
   the `alpha/my-feature` branch in the branch dropdown, and under
   [Publish alpha prerelease](../.github/workflows/publish-alpha.yml), click
   **Run workflow** (`workflow_dispatch`) and provide:
   - **`version`**: the explicit alpha version (e.g. `2.15.0-alpha.0`,
     `2.15.0-alpha.1`).

   The workflow will only run on `alpha/*` branches.

4. **Automated validation & publishing**:
   - **Pre-publish check**: Verifies the version does not already exist on npm
     for all six packages. If a previous publish partially failed, rerunning with
     the same version resumes safely (`from-package` skips already published packages).
   - **Version bump & CI checks**: Runs `lerna version` with
     `--exact --force-publish` to bump all six public packages, internal
     cross-dependencies, `lerna.json`, and the private smoke harness locally on
     the runner, then runs the full quality suite (`build`, `typecheck`, `lint`,
     `circular-deps`, and `unit tests`).
   - **Publish to npm**: Runs under the `publish-alpha` GitHub Environment with
     OIDC Trusted Publishing and publishes with `--dist-tag alpha`.
   - **Post-publish check**: Confirms all six packages are published on npm.
5. **Testing**: Applications testing the feature pin the exact version:

   ```sh
   npm install @grafana/faro-web-sdk@2.15.0-alpha.0
   ```

6. **Promoting to `main`**: When testing is complete, open a PR from
   `alpha/my-feature` into `main`. The branch merges cleanly with zero version or
   changelog conflicts, and the standard stable Release Please workflow on
   `main` handles the official release. The feature branch is then deleted.

## Skipping a release

If you want to merge changes without ever publishing them, use commit types that
don't trigger a bump (`chore:`, `docs:`, `refactor:`, `test:`, etc.) or annotate
the message with `Release-As: <version>` to override.
