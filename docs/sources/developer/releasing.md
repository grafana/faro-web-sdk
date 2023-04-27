# Releasing

To release a new version, run `npx lerna version` on the main branch.
It will ask some questions, bump package versions, tag & push.
CI will pick it up from there and publish to npm.

**Note:**
Before calling `npx lerna version` always ensure that your local main branch is 1:1 with origin/main.

- Do `git pull` the main branch
- Check `git status` to double check if you have any unpushed changes

**Note 2:**
You need special access privileges to be able push to the protected main branch.
It's recommended to protect the main branch with your local tooling.

For VsCode

- Add your branch to the `git.branchProtection` property
- Set `git.branchProtectionPrompt` to `always prompt`
