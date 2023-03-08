# Releasing

To release a new version, run `npx lerna version` on the main branch.
It will ask some questions, bump package versions, tag & push. CI
will pick it up from there and publish to npm.

❗️Note
Before calling `npx lerna version` always ensure that your local main branch is 1:1 with origin/main.

- Do a `git pull` the main branch
- Do a `git status` to double check if you have any unpushed changes
