import fs from 'node:fs';
import path from 'node:path';

/**
 * Extracts the single source of truth exempt PR labels from .github/workflows/stale.yml.
 * Fails loud if the file cannot be read or no exempt labels are found.
 *
 * @param {string} staleWorkflowPath
 * @returns {string[]}
 */
export function getExemptLabels(staleWorkflowPath) {
  if (!fs.existsSync(staleWorkflowPath)) {
    throw new Error(`stale.yml not found at expected path: ${staleWorkflowPath}`);
  }

  const content = fs.readFileSync(staleWorkflowPath, 'utf8');

  // Parse lines looking for exempt-pr-labels block scalar
  const lines = content.split('\n');
  let capturing = false;
  let baseIndent = 0;
  const rawParts = [];

  for (const line of lines) {
    if (!capturing) {
      const match = line.match(/^(\s*)exempt-pr-labels:\s*>-?/);
      if (match) {
        capturing = true;
        baseIndent = match[1].length;
      }
    } else {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith('#')) {
        continue;
      }
      const currentIndent = line.search(/\S/);
      if (currentIndent <= baseIndent) {
        break; // Outdented, block scalar ended
      }
      rawParts.push(trimmed);
    }
  }

  const labels = rawParts
    .join(' ')
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean);

  if (labels.length === 0) {
    throw new Error(`Failed to extract any exempt-pr-labels from ${staleWorkflowPath}`);
  }

  return labels;
}

/**
 * Checks if a PR has any exempt labels.
 *
 * @param {object} pr
 * @param {string[]} exemptLabels
 * @returns {string | null} Returns the first matching exempt label or null.
 */
export function getExemptReason(pr, exemptLabels) {
  if (!pr.labels || !Array.isArray(pr.labels)) {
    return null;
  }
  const labelNames = pr.labels.map((l) => (typeof l === 'string' ? l : l.name));
  for (const exempt of exemptLabels) {
    if (labelNames.includes(exempt)) {
      return exempt;
    }
  }
  return null;
}

/**
 * Evaluates the timeline of a PR to determine:
 * 1. The timestamp of the most recent 'respond-or-close' label.
 * 2. Whether the PR author has responded (comment or commit) after that label.
 *
 * @param {object[]} timelineEvents
 * @param {string} authorLogin
 * @returns {{
 *   labeledAt: Date | null,
 *   authorRespondedAfterLabel: boolean,
 *   lastAuthorEvent: object | null
 * }}
 */
export function evaluateTimeline(timelineEvents, authorLogin) {
  if (!Array.isArray(timelineEvents)) {
    return { labeledAt: null, authorRespondedAfterLabel: false, lastAuthorEvent: null };
  }

  // Find the most recent 'labeled' event for 'respond-or-close'
  let lastLabeledEvent = null;
  for (let i = timelineEvents.length - 1; i >= 0; i--) {
    const ev = timelineEvents[i];
    if (ev.event === 'labeled' && ev.label?.name === 'respond-or-close') {
      lastLabeledEvent = ev;
      break;
    }
  }

  if (!lastLabeledEvent) {
    return { labeledAt: null, authorRespondedAfterLabel: false, lastAuthorEvent: null };
  }

  const labeledAt = new Date(lastLabeledEvent.created_at);

  // Check for author activity strictly after labeledAt
  let authorRespondedAfterLabel = false;
  let lastAuthorEvent = null;

  for (const ev of timelineEvents) {
    const eventTime = new Date(ev.created_at || ev.submitted_at || ev.author?.date || 0);
    if (eventTime <= labeledAt) {
      continue;
    }

    // Check author comment
    if (ev.event === 'commented') {
      const commenter = ev.actor?.login || ev.user?.login;
      const isBot = ev.actor?.type === 'Bot' || ev.user?.type === 'Bot';
      if (commenter === authorLogin && !isBot) {
        authorRespondedAfterLabel = true;
        lastAuthorEvent = ev;
      }
    }

    // Check author commit push
    if (ev.event === 'committed') {
      const commitAuthor = ev.author?.login || ev.author?.name || ev.committer?.login;
      if (commitAuthor === authorLogin) {
        authorRespondedAfterLabel = true;
        lastAuthorEvent = ev;
      }
    }
  }

  return { labeledAt, authorRespondedAfterLabel, lastAuthorEvent };
}

/**
 * Minimal GitHub API client wrapper using standard fetch.
 */
export class GitHubClient {
  constructor({ token, repo, apiUrl = 'https://api.github.com' }) {
    this.token = token;
    this.repo = repo;
    const [owner, name] = repo.split('/');
    this.owner = owner;
    this.repoName = name;
    this.apiUrl = apiUrl.replace(/\/+$/, '');
  }

  async request(endpoint, options = {}) {
    const url = endpoint.startsWith('http') ? endpoint : `${this.apiUrl}${endpoint}`;
    const headers = {
      Accept: 'application/vnd.github+json',
      Authorization: `Bearer ${this.token}`,
      'X-GitHub-Api-Version': '2022-11-28',
      'User-Agent': 'grafana-faro-pr-sweeper',
      ...options.headers,
    };

    const res = await fetch(url, {
      ...options,
      headers,
    });

    if (res.status === 204) {
      return null;
    }

    const data = await res.json().catch(() => null);

    if (!res.ok) {
      const error = new Error(`GitHub API Error ${res.status}: ${data?.message || res.statusText}`);
      error.status = res.status;
      error.data = data;
      throw error;
    }

    return data;
  }

  async listOpenPrsWithLabel(labelName) {
    // List open pull requests
    const prs = [];
    let page = 1;
    while (true) {
      const batch = await this.request(
        `/repos/${this.owner}/${this.repoName}/pulls?state=open&per_page=100&page=${page}`
      );
      if (!batch || batch.length === 0) {
        break;
      }
      for (const pr of batch) {
        if (pr.labels?.some((l) => l.name === labelName)) {
          prs.push(pr);
        }
      }
      if (batch.length < 100) {
        break;
      }
      page++;
    }
    return prs;
  }

  async getPr(prNumber) {
    return this.request(`/repos/${this.owner}/${this.repoName}/pulls/${prNumber}`);
  }

  async getTimeline(issueNumber) {
    const events = [];
    let page = 1;
    while (true) {
      const batch = await this.request(
        `/repos/${this.owner}/${this.repoName}/issues/${issueNumber}/timeline?per_page=100&page=${page}`
      );
      if (!batch || batch.length === 0) {
        break;
      }
      events.push(...batch);
      if (batch.length < 100) {
        break;
      }
      page++;
    }
    return events;
  }

  async removeLabel(issueNumber, labelName) {
    try {
      await this.request(
        `/repos/${this.owner}/${this.repoName}/issues/${issueNumber}/labels/${encodeURIComponent(labelName)}`,
        { method: 'DELETE' }
      );
    } catch (err) {
      if (err.status === 404) {
        return; // Already removed
      }
      throw err;
    }
  }

  async addComment(issueNumber, body) {
    return this.request(`/repos/${this.owner}/${this.repoName}/issues/${issueNumber}/comments`, {
      method: 'POST',
      body: JSON.stringify({ body }),
    });
  }

  async closePr(prNumber) {
    return this.request(`/repos/${this.owner}/${this.repoName}/pulls/${prNumber}`, {
      method: 'PATCH',
      body: JSON.stringify({ state: 'closed' }),
    });
  }

  async checkBranchExists(owner, repo, branch) {
    try {
      await this.request(`/repos/${owner}/${repo}/branches/${encodeURIComponent(branch)}`);
      return true;
    } catch (err) {
      if (err.status === 404) {
        return false;
      }
      throw err;
    }
  }

  async findExistingReplacementPr(headRefSpec) {
    // Check if an open PR exists with the same head
    const prs = await this.request(
      `/repos/${this.owner}/${this.repoName}/pulls?state=open&head=${encodeURIComponent(headRefSpec)}`
    );
    return prs && prs.length > 0 ? prs[0] : null;
  }

  async createPullRequest({ title, head, base, body, draft }) {
    return this.request(`/repos/${this.owner}/${this.repoName}/pulls`, {
      method: 'POST',
      body: JSON.stringify({
        title,
        head,
        base,
        body,
        draft: !!draft,
      }),
    });
  }

  async setLabels(issueNumber, labels) {
    return this.request(`/repos/${this.owner}/${this.repoName}/issues/${issueNumber}/labels`, {
      method: 'POST',
      body: JSON.stringify({ labels }),
    });
  }
}

/**
 * Main sweeper execution logic.
 */
export async function runSweep({
  githubToken,
  botToken,
  repository,
  staleWorkflowPath,
  dryRun = false,
  prNumber = null,
  now = new Date(),
  clientOverride = null,
  botClientOverride = null,
}) {
  const stalePath = staleWorkflowPath || path.resolve(process.cwd(), '.github/workflows/stale.yml');
  const exemptLabels = getExemptLabels(stalePath);
  console.log(
    `[respond-or-close] Loaded ${exemptLabels.length} exempt labels from ${stalePath}: ${exemptLabels.join(', ')}`
  );

  const client = clientOverride || new GitHubClient({ token: githubToken, repo: repository });
  const botClient = botClientOverride || new GitHubClient({ token: botToken || githubToken, repo: repository });

  let prsToProcess = [];
  if (prNumber) {
    console.log(`[respond-or-close] Targeted run for single PR #${prNumber}`);
    const pr = await client.getPr(prNumber);
    if (!pr.labels?.some((l) => l.name === 'respond-or-close')) {
      console.log(`[respond-or-close] PR #${prNumber} does not have label 'respond-or-close'. Nothing to do.`);
      return { processed: 0, closed: 0, recreated: 0, exempt: 0, skipped: 1 };
    }
    prsToProcess = [pr];
  } else {
    prsToProcess = await client.listOpenPrsWithLabel('respond-or-close');
    console.log(`[respond-or-close] Found ${prsToProcess.length} open PR(s) labeled 'respond-or-close'`);
  }

  const results = {
    processed: prsToProcess.length,
    closed: 0,
    recreated: 0,
    exempt: 0,
    skipped: 0,
    labelsRemoved: 0,
  };

  const SEVEN_DAYS_MS = 7 * 24 * 60 * 60 * 1000;

  for (const pr of prsToProcess) {
    const prLogPrefix = `[PR #${pr.number}]`;
    console.log(`${prLogPrefix} Inspecting PR "${pr.title}" by @${pr.user?.login}`);

    // Check exempt labels (single source of truth)
    const exemptReason = getExemptReason(pr, exemptLabels);
    if (exemptReason) {
      console.log(`${prLogPrefix} Exempt from respond-or-close due to label: "${exemptReason}". Skipping.`);
      results.exempt++;
      continue;
    }

    // Inspect timeline
    const timeline = await client.getTimeline(pr.number);
    const { labeledAt, authorRespondedAfterLabel, lastAuthorEvent } = evaluateTimeline(timeline, pr.user?.login);

    if (!labeledAt) {
      console.log(`${prLogPrefix} Could not find 'labeled' timeline event for 'respond-or-close'. Skipping.`);
      results.skipped++;
      continue;
    }

    if (authorRespondedAfterLabel) {
      console.log(
        `${prLogPrefix} Author activity detected after labeling (at ${lastAuthorEvent?.created_at}). Removing 'respond-or-close' label.`
      );
      results.labelsRemoved++;
      if (!dryRun) {
        await client.removeLabel(pr.number, 'respond-or-close');
      } else {
        console.log(`${prLogPrefix} [DRY RUN] Would remove 'respond-or-close' label.`);
      }
      continue;
    }

    const elapsedMs = now.getTime() - labeledAt.getTime();
    const elapsedDays = (elapsedMs / (1000 * 60 * 60 * 24)).toFixed(1);

    if (elapsedMs < SEVEN_DAYS_MS) {
      console.log(`${prLogPrefix} Label applied ${elapsedDays} days ago (< 7 days). Waiting for author response.`);
      results.skipped++;
      continue;
    }

    console.log(
      `${prLogPrefix} Labeled for ${elapsedDays} days with no author response (>= 7 days). Eligible for close and recreation.`
    );

    // Verify head branch exists
    const isFork = pr.head.repo && pr.head.repo.full_name !== pr.base.repo?.full_name;
    const headOwner = pr.head.repo?.owner?.login || pr.head.user?.login;
    const headRepoName = pr.head.repo?.name;
    const headBranch = pr.head.ref;
    const headRefSpec = isFork ? `${headOwner}:${headBranch}` : headBranch;

    let branchExists = false;
    if (pr.head.repo && headOwner && headRepoName && headBranch) {
      branchExists = await client.checkBranchExists(headOwner, headRepoName, headBranch);
    }

    if (!branchExists) {
      console.log(`${prLogPrefix} Head branch "${headRefSpec}" does not exist or fork was deleted.`);
      if (!dryRun) {
        await client.addComment(
          pr.number,
          `This pull request was labeled \`respond-or-close\` and has had no author response for 7 days. Because the head branch \`${headRefSpec}\` is no longer accessible, a replacement pull request cannot be created automatically. Closing this pull request.`
        );
        await client.closePr(pr.number);
      } else {
        console.log(`${prLogPrefix} [DRY RUN] Would close PR without recreation due to missing branch.`);
      }
      results.closed++;
      continue;
    }

    // Idempotency check: see if a replacement PR already exists
    const existingReplacement = await client.findExistingReplacementPr(headRefSpec);
    if (existingReplacement && existingReplacement.number !== pr.number) {
      console.log(
        `${prLogPrefix} Replacement PR already exists at #${existingReplacement.number}. Closing original PR and linking.`
      );
      if (!dryRun) {
        await client.addComment(
          pr.number,
          `This pull request has been closed because there was no author response for 7 days while labeled \`respond-or-close\`. A replacement pull request is already open at #${existingReplacement.number}.`
        );
        await client.closePr(pr.number);
      } else {
        console.log(
          `${prLogPrefix} [DRY RUN] Would close PR and link to existing replacement #${existingReplacement.number}.`
        );
      }
      results.closed++;
      continue;
    }

    if (dryRun) {
      console.log(
        `${prLogPrefix} [DRY RUN] Would close PR #${pr.number} and create replacement PR from head "${headRefSpec}" to base "${pr.base.ref}".`
      );
      results.closed++;
      results.recreated++;
      continue;
    }

    // Execute Close & Recreation
    console.log(`${prLogPrefix} Closing original PR and opening replacement PR via bot.`);

    // 1. Close original PR
    await client.closePr(pr.number);
    results.closed++;

    // 2. Open replacement PR via bot
    const replacementTitle = pr.title.startsWith('[Recreated]') ? pr.title : `[Recreated] ${pr.title}`;
    const replacementBody = [
      `> [!NOTE]`,
      `> This pull request was automatically recreated by the repository bot because the original pull request #${pr.number} by @${pr.user.login} was waiting for an author response for 7 days under the \`respond-or-close\` policy.`,
      `> The source branch has been preserved for maintainers to review, update, and merge.`,
      ``,
      `**Original Pull Request:** #${pr.number}`,
      `**Original Author:** @${pr.user.login}`,
      ``,
      `---`,
      ``,
      `### Original PR Description`,
      ``,
      pr.body || '_No description provided._',
    ].join('\n');

    let newPr = null;
    try {
      newPr = await botClient.createPullRequest({
        title: replacementTitle,
        head: headRefSpec,
        base: pr.base.ref,
        body: replacementBody,
        draft: pr.draft,
      });
      results.recreated++;
      console.log(`${prLogPrefix} Successfully created replacement PR #${newPr.number}`);

      // Copy non-automation labels from original PR
      const labelsToCopy = (pr.labels || [])
        .map((l) => (typeof l === 'string' ? l : l.name))
        .filter((name) => name !== 'respond-or-close' && name !== 'stale');

      if (labelsToCopy.length > 0) {
        await botClient.setLabels(newPr.number, labelsToCopy);
      }

      // Add comment to original PR linking to replacement PR
      await client.addComment(
        pr.number,
        `This pull request has been closed because there was no author response for 7 days while labeled \`respond-or-close\`. The source branch was preserved and a replacement pull request has been opened at #${newPr.number} for maintainers to take over.`
      );
    } catch (createErr) {
      console.error(`${prLogPrefix} Failed to create replacement PR: ${createErr.message}`);
      await client.addComment(
        pr.number,
        `This pull request was closed after 7 days without an author response under the \`respond-or-close\` policy. An automated attempt to create a replacement pull request from \`${headRefSpec}\` encountered an error: ${createErr.message}. The source branch is preserved.`
      );
    }
  }

  console.log(`[respond-or-close] Sweep completed:`, results);
  return results;
}

// CLI entry point
if (process.argv[1] && process.argv[1].endsWith('respond-or-close.mjs')) {
  const githubToken = process.env.GITHUB_TOKEN;
  const botToken = process.env.BOT_TOKEN || process.env.GITHUB_TOKEN;
  const repository = process.env.GITHUB_REPOSITORY;
  const dryRun = process.env.DRY_RUN === 'true' || process.argv.includes('--dry-run');
  const prNumber = process.env.PR_NUMBER ? parseInt(process.env.PR_NUMBER, 10) : null;

  if (!githubToken || !repository) {
    console.error('Missing required environment variables: GITHUB_TOKEN and GITHUB_REPOSITORY.');
    process.exit(1);
  }

  runSweep({
    githubToken,
    botToken,
    repository,
    dryRun,
    prNumber,
  }).catch((err) => {
    console.error('Fatal error during sweep:', err);
    process.exit(1);
  });
}
