import test from 'node:test';
import assert from 'node:assert/strict';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { getExemptLabels, getExemptReason, evaluateTimeline, runSweep } from './respond-or-close.mjs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const stalePath = path.resolve(__dirname, '../stale.yml');

test('getExemptLabels parses single source of truth from stale.yml', () => {
  const labels = getExemptLabels(stalePath);
  assert.ok(Array.isArray(labels));
  assert.ok(labels.includes('keep-open'));
  assert.ok(labels.includes('dependencies'));
  assert.ok(labels.includes('update-major'));
  assert.ok(labels.includes('automerge-security-update'));
  assert.ok(labels.includes('security-needs-review'));
  assert.ok(labels.includes('1.security'));
  assert.ok(labels.includes('autorelease: pending'));
  assert.equal(labels.length, 7);
});

test('getExemptReason identifies exempt labels accurately', () => {
  const exemptLabels = ['keep-open', 'dependencies'];

  // Not exempt
  assert.equal(getExemptReason({ labels: [{ name: 'bug' }] }, exemptLabels), null);
  assert.equal(getExemptReason({ labels: [] }, exemptLabels), null);

  // Exempt with string labels
  assert.equal(getExemptReason({ labels: ['feature', 'keep-open'] }, exemptLabels), 'keep-open');

  // Exempt with object labels
  assert.equal(
    getExemptReason({ labels: [{ name: 'dependencies' }, { name: 'respond-or-close' }] }, exemptLabels),
    'dependencies'
  );
});

test('evaluateTimeline handles labeling and author response events', () => {
  const author = 'contributor1';
  const labelTime = '2026-10-01T10:00:00Z';

  // Case 1: No respond-or-close label
  const tl1 = [{ event: 'labeled', label: { name: 'bug' }, created_at: labelTime }];
  const res1 = evaluateTimeline(tl1, author);
  assert.equal(res1.labeledAt, null);
  assert.equal(res1.authorRespondedAfterLabel, false);

  // Case 2: Labeled, but only maintainer or bot commented afterwards
  const tl2 = [
    { event: 'labeled', label: { name: 'respond-or-close' }, created_at: labelTime },
    {
      event: 'commented',
      actor: { login: 'maintainer1', type: 'User' },
      created_at: '2026-10-02T10:00:00Z',
    },
    {
      event: 'commented',
      actor: { login: author, type: 'Bot' },
      created_at: '2026-10-03T10:00:00Z',
    },
  ];
  const res2 = evaluateTimeline(tl2, author);
  assert.equal(res2.labeledAt?.toISOString(), new Date(labelTime).toISOString());
  assert.equal(res2.authorRespondedAfterLabel, false);

  // Case 3: Author commented before label (does not count)
  const tl3 = [
    {
      event: 'commented',
      actor: { login: author, type: 'User' },
      created_at: '2026-09-30T10:00:00Z',
    },
    { event: 'labeled', label: { name: 'respond-or-close' }, created_at: labelTime },
  ];
  const res3 = evaluateTimeline(tl3, author);
  assert.equal(res3.authorRespondedAfterLabel, false);

  // Case 4: Author commented after label
  const tl4 = [
    { event: 'labeled', label: { name: 'respond-or-close' }, created_at: labelTime },
    {
      event: 'commented',
      actor: { login: author, type: 'User' },
      created_at: '2026-10-02T10:00:00Z',
    },
  ];
  const res4 = evaluateTimeline(tl4, author);
  assert.equal(res4.authorRespondedAfterLabel, true);

  // Case 5: Author pushed commit after label
  const tl5 = [
    { event: 'labeled', label: { name: 'respond-or-close' }, created_at: labelTime },
    {
      event: 'committed',
      author: { login: author },
      created_at: '2026-10-03T10:00:00Z',
    },
  ];
  const res5 = evaluateTimeline(tl5, author);
  assert.equal(res5.authorRespondedAfterLabel, true);
});

test('runSweep processes exemptions, age checks, missing branch, existing replacement, and recreation', async () => {
  const baseDate = new Date('2026-10-15T00:00:00Z');
  const tenDaysAgo = new Date('2026-10-05T00:00:00Z').toISOString();
  const threeDaysAgo = new Date('2026-10-12T00:00:00Z').toISOString();

  // Mock PRs
  const mockPrs = [
    // PR 1: Exempt by keep-open
    {
      number: 1,
      title: 'Exempt PR',
      user: { login: 'user1' },
      labels: [{ name: 'respond-or-close' }, { name: 'keep-open' }],
      head: { ref: 'feat1', repo: { name: 'faro', owner: { login: 'user1' }, full_name: 'user1/faro' } },
      base: { ref: 'main', repo: { full_name: 'grafana/faro' } },
    },
    // PR 2: Waiting (< 7 days)
    {
      number: 2,
      title: 'Recent PR',
      user: { login: 'user2' },
      labels: [{ name: 'respond-or-close' }],
      head: { ref: 'feat2', repo: { name: 'faro', owner: { login: 'user2' }, full_name: 'user2/faro' } },
      base: { ref: 'main', repo: { full_name: 'grafana/faro' } },
    },
    // PR 3: Author responded -> remove label
    {
      number: 3,
      title: 'Active PR',
      user: { login: 'user3' },
      labels: [{ name: 'respond-or-close' }],
      head: { ref: 'feat3', repo: { name: 'faro', owner: { login: 'user3' }, full_name: 'user3/faro' } },
      base: { ref: 'main', repo: { full_name: 'grafana/faro' } },
    },
    // PR 4: Missing branch -> close with note, do not recreate
    {
      number: 4,
      title: 'Missing Branch PR',
      user: { login: 'user4' },
      labels: [{ name: 'respond-or-close' }],
      head: { ref: 'feat4', repo: { name: 'faro', owner: { login: 'user4' }, full_name: 'user4/faro' } },
      base: { ref: 'main', repo: { full_name: 'grafana/faro' } },
    },
    // PR 5: Existing replacement -> close and link
    {
      number: 5,
      title: 'Already Replaced PR',
      user: { login: 'user5' },
      labels: [{ name: 'respond-or-close' }],
      head: { ref: 'feat5', repo: { name: 'faro', owner: { login: 'user5' }, full_name: 'user5/faro' } },
      base: { ref: 'main', repo: { full_name: 'grafana/faro' } },
    },
    // PR 6: Eligible -> close & recreate
    {
      number: 6,
      title: 'Eligible PR',
      user: { login: 'user6' },
      labels: [{ name: 'respond-or-close' }, { name: 'enhancement' }],
      head: { ref: 'feat6', repo: { name: 'faro', owner: { login: 'user6' }, full_name: 'user6/faro' } },
      base: { ref: 'main', repo: { full_name: 'grafana/faro' } },
      body: 'Important feature details',
    },
  ];

  const mockTimelines = {
    1: [{ event: 'labeled', label: { name: 'respond-or-close' }, created_at: tenDaysAgo }],
    2: [{ event: 'labeled', label: { name: 'respond-or-close' }, created_at: threeDaysAgo }],
    3: [
      { event: 'labeled', label: { name: 'respond-or-close' }, created_at: tenDaysAgo },
      { event: 'commented', actor: { login: 'user3', type: 'User' }, created_at: threeDaysAgo },
    ],
    4: [{ event: 'labeled', label: { name: 'respond-or-close' }, created_at: tenDaysAgo }],
    5: [{ event: 'labeled', label: { name: 'respond-or-close' }, created_at: tenDaysAgo }],
    6: [{ event: 'labeled', label: { name: 'respond-or-close' }, created_at: tenDaysAgo }],
  };

  const actions = {
    closed: [],
    recreated: [],
    comments: [],
    labelsRemoved: [],
    labelsSet: [],
  };

  const mockClient = {
    async listOpenPrsWithLabel() {
      return mockPrs;
    },
    async getTimeline(num) {
      return mockTimelines[num] || [];
    },
    async removeLabel(num, label) {
      actions.labelsRemoved.push({ num, label });
    },
    async addComment(num, body) {
      actions.comments.push({ num, body });
    },
    async closePr(num) {
      actions.closed.push(num);
    },
    async checkBranchExists(owner, repo, branch) {
      // PR 4 branch does not exist
      if (branch === 'feat4') return false;
      return true;
    },
    async findExistingReplacementPr(headRefSpec) {
      if (headRefSpec === 'user5:feat5') {
        return { number: 99, title: '[Recreated] Already Replaced PR' };
      }
      return null;
    },
  };

  const mockBotClient = {
    async createPullRequest(data) {
      actions.recreated.push(data);
      return { number: 100, ...data };
    },
    async setLabels(num, labels) {
      actions.labelsSet.push({ num, labels });
    },
  };

  const results = await runSweep({
    githubToken: 'fake',
    repository: 'grafana/faro-web-sdk',
    staleWorkflowPath: stalePath,
    dryRun: false,
    now: baseDate,
    clientOverride: mockClient,
    botClientOverride: mockBotClient,
  });

  // Verify results counts
  assert.equal(results.exempt, 1); // PR 1
  assert.equal(results.skipped, 1); // PR 2
  assert.equal(results.labelsRemoved, 1); // PR 3
  assert.equal(results.closed, 3); // PR 4 (missing branch), PR 5 (existing replacement), PR 6 (eligible)
  assert.equal(results.recreated, 1); // PR 6

  // Verify label removed on PR 3
  assert.deepEqual(actions.labelsRemoved, [{ num: 3, label: 'respond-or-close' }]);

  // Verify PR 4 closed without recreation
  assert.ok(actions.closed.includes(4));
  assert.ok(actions.comments.some((c) => c.num === 4 && c.body.includes('is no longer accessible')));

  // Verify PR 5 linked to existing PR 99
  assert.ok(actions.closed.includes(5));
  assert.ok(actions.comments.some((c) => c.num === 5 && c.body.includes('#99')));

  // Verify PR 6 recreated with proper metadata and labels
  assert.ok(actions.closed.includes(6));
  assert.equal(actions.recreated.length, 1);
  const recreatedPr = actions.recreated[0];
  assert.equal(recreatedPr.title, '[Recreated] Eligible PR');
  assert.equal(recreatedPr.head, 'user6:feat6');
  assert.equal(recreatedPr.base, 'main');
  assert.ok(recreatedPr.body.includes('#6'));
  assert.ok(recreatedPr.body.includes('@user6'));
  assert.ok(recreatedPr.body.includes('Important feature details'));

  // Verify copied non-automation label 'enhancement' (respond-or-close excluded)
  assert.deepEqual(actions.labelsSet, [{ num: 100, labels: ['enhancement'] }]);

  // Verify closing comment on PR 6 links to #100
  assert.ok(actions.comments.some((c) => c.num === 6 && c.body.includes('#100')));
});
