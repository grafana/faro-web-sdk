# Pull Requests

How pull requests work in this repository. For local setup, see
[local-development.md](./sources/developer/local-development.md).

## Inactive pull requests

A pull request with no activity for a long time is closed automatically. The
[Stale PRs workflow](../.github/workflows/stale.yml) runs once a day and works
like this:

1. After **60 days** with no activity, it adds the `stale` label and writes a
   comment on the pull request. You get a notification, because you are
   subscribed to your own pull request.
2. **14 days later**, it closes the pull request.

Closing is not final. The branch is kept, so you can reopen the pull request at
any time and continue where you stopped.

Draft pull requests are included. A draft that nobody has touched for two months
is treated the same as any other pull request.

### How to keep a pull request open

Any one of these is enough:

- Leave a comment, or push a commit. Any activity removes the label and starts
  the 60 days again.
- Remove the `stale` label.
- Add the `keep-open` label. Use this for work that is meant to stay open for a
  long time, for example a proposal that is waiting on a decision. The workflow
  then leaves the pull request alone.

If you are waiting for a review from a maintainer, a comment on the pull request
is enough to keep it open. Please do not let a contribution close only because
the review took a while.

Some pull requests are never closed by the workflow. Renovate pull requests are
exempt, because closing one would drop that dependency update without telling
anyone. Security pull requests and the automated release pull request are exempt
as well. The full list is the `exempt-pr-labels` option in the workflow file.
