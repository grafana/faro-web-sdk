# Faro Web SDK agent instructions

## Formatting and CI fixes

- When continuous integration reports auto-fixable lint or formatting issues in files within the
  current task, run `yarn quality:lint:fix` and include the resulting task-related fixes without
  asking the user to apply them manually.
- Before running a fixer, inspect the working tree. Preserve all pre-existing and unrelated changes.
- After applying fixes, run `yarn quality:lint` and the tests relevant to the changed files.
- If the fixer changes files outside the task scope, do not silently include or discard those
  changes. Report them to the user.
