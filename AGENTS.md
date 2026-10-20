# Faro Web SDK agent instructions

## Formatting and CI fixes

- When continuous integration reports auto-fixable lint or formatting issues in files within the
  current task, run `yarn quality:lint:fix` and include the resulting task-related fixes without
  asking the user to apply them manually.
- Before running a fixer, inspect the working tree. Preserve all pre-existing and unrelated changes.
- After applying fixes, run `yarn quality:lint` and the tests relevant to the changed files.
- If the fixer changes files outside the task scope, do not silently include or discard those
  changes. Report them to the user.

## Pull requests

- A pull request with no activity for 60 days is labelled `stale` and closed 14 days later. Any
  activity resets the clock, and the `keep-open` label exempts a pull request completely. Drafts are
  included. See [docs/PULL_REQUESTS.md](docs/PULL_REQUESTS.md).
- The exempt label list in `.github/workflows/stale.yml` is the single source of truth. Do not
  duplicate it elsewhere.
