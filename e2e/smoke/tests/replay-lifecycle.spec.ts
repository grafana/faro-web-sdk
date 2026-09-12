import { type Browser, chromium, expect, type Page, test } from '@playwright/test';
import { spawn } from 'node:child_process';
import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

interface ReplayEvent {
  name: string;
  session: string;
  recording: string;
  seq?: number;
  gen?: number;
  type?: number;
}

interface Checkpoint {
  sessionId: string;
  recordingId: string;
  nextSeq: number;
  gen: number;
  documentId: string;
  handoff: 'active' | 'clean';
}

declare global {
  interface Window {
    replayFixture: {
      key: string;
      documentId: string;
      initializationId: string;
      initialCheckpoint: string | null;
      events: ReplayEvent[];
      lifecycle: Array<{ name: string; trusted: boolean; persisted?: boolean; checkpoint: Checkpoint | null }>;
      writes: Array<{ name: string; handoff: string; at: number }>;
      checkpoint: () => Checkpoint | null;
      start: () => void;
      stop: () => void;
      replace: () => void;
      storageFailure: (reads: boolean, writes: boolean) => void;
      measure: (count: number) => { elapsedMs: number; events: number; writes: number };
    };
  }
}

// Playwright disables BFCache by default; use the full Chromium build and allow
// the browser to cache the actual SDK/rrweb documents in both directions.
test.use({ launchOptions: { channel: 'chromium', ignoreDefaultArgs: ['--disable-back-forward-cache'] } });

async function state(page: Page) {
  return page.evaluate(() => {
    const fixture = window.replayFixture;
    return {
      documentId: fixture.documentId,
      initializationId: fixture.initializationId,
      events: fixture.events,
      lifecycle: fixture.lifecycle,
      checkpoint: fixture.checkpoint(),
      initialCheckpoint: fixture.initialCheckpoint,
    };
  });
}

async function snapshots(page: Page, count = 1) {
  await expect
    .poll(() => page.evaluate(() => window.replayFixture?.events.filter((event) => event.type === 2).length ?? 0))
    .toBe(count);
  return state(page);
}

function recordingEvents(observation: Awaited<ReturnType<typeof state>>) {
  return observation.events.filter((event) => event.seq != null);
}

function expectContinuous(events: ReplayEvent[]) {
  const sorted = [...events].sort((left, right) => left.seq! - right.seq!);
  expect(new Set(sorted.map((event) => event.recording)).size).toBe(1);
  expect(new Set(sorted.map((event) => event.session))).toEqual(new Set(['lifecycle-session']));
  expect(sorted.map((event) => event.seq)).toEqual(sorted.map((_, index) => index));
  const generations = sorted.filter((event) => event.type === 4).map((event) => event.gen);
  expect(generations).toEqual(generations.map((_, index) => index));
}

test('continues real recordings through both BFCache directions, rapid traversal, replacement, and reload', async ({
  page,
}) => {
  await page.goto('/replay-lifecycle?name=a');
  const firstA = await snapshots(page);
  await page.locator('#next').click();
  const firstB = await snapshots(page);
  expect(firstB.documentId).not.toBe(firstA.documentId);
  expect(firstB.checkpoint?.recordingId).toBe(firstA.checkpoint?.recordingId);
  let latestA = firstA;
  for (let traversal = 0; traversal < 2; traversal++) {
    await page.goBack({ waitUntil: 'commit' });
    latestA = await snapshots(page, traversal + 2);
    expect(latestA.documentId).toBe(firstA.documentId);
    expect(latestA.initializationId).toBe(firstA.initializationId);
    expect(latestA.lifecycle.filter((event) => event.name === 'pageshow').at(-1)).toMatchObject({
      persisted: true,
      trusted: true,
    });
    await page.goForward({ waitUntil: 'commit' });
    const latestB = await snapshots(page, traversal + 2);
    expect(latestB.documentId).toBe(firstB.documentId);
    expect(latestB.initializationId).toBe(firstB.initializationId);
    expect(latestB.lifecycle.filter((event) => event.name === 'pageshow').at(-1)).toMatchObject({
      persisted: true,
      trusted: true,
    });
  }
  await page.evaluate(() => window.replayFixture.replace());
  const latestB = await snapshots(page, 4);
  expect(latestB.initializationId).not.toBe(firstB.initializationId);
  expect(latestB.checkpoint?.recordingId).toBe(firstA.checkpoint?.recordingId);
  for (const observation of [latestA, latestB]) {
    expect(
      observation.lifecycle
        .filter((event) => event.name === 'pageswap')
        .every((event) => event.trusted && event.checkpoint?.handoff === 'clean')
    ).toBe(true);
  }
  await page.reload();
  const reloaded = await snapshots(page);
  expect(reloaded.documentId).not.toBe(firstB.documentId);
  expect(reloaded.checkpoint?.recordingId).toBe(firstA.checkpoint?.recordingId);
  expectContinuous([...recordingEvents(latestA), ...recordingEvents(latestB), ...recordingEvents(reloaded)]);
  await test.info().attach('native-recording-handoff', {
    contentType: 'application/json',
    body: JSON.stringify({ latestA, latestB, reloaded }),
  });
});

test('retains native ownership across inactivity and resumes with one new snapshot', async ({ page }) => {
  await page.goto('/replay-lifecycle?inactivity=1000');
  const initial = await snapshots(page);
  await expect
    .poll(async () => (await state(page)).events.filter((event) => event.name.endsWith('.paused')).length)
    .toBe(1);
  expect((await page.evaluate(() => navigator.locks.query())).held).toHaveLength(1);
  expect((await state(page)).checkpoint?.handoff).toBe('active');
  await page.locator('#interact').click();
  const resumed = await snapshots(page, 2);
  expect(resumed.checkpoint?.recordingId).toBe(initial.checkpoint?.recordingId);
  expect(resumed.events.filter((event) => event.name.endsWith('.resumed'))).toHaveLength(1);
  expectContinuous(recordingEvents(resumed));
});

test('finalizes on native freeze and reacquires on native resume', async ({ baseURL }) => {
  // Playwright's focus emulation prevents native freeze. Connect without those
  // overrides to the default context of a fresh, isolated browser process.
  const profile = await mkdtemp(join(tmpdir(), 'faro-native-freeze-'));
  const chromiumProcess = spawn(
    chromium.executablePath(),
    [
      '--headless=new',
      '--no-sandbox',
      '--remote-debugging-port=0',
      '--remote-debugging-address=127.0.0.1',
      `--user-data-dir=${profile}`,
      '--no-first-run',
      '--no-default-browser-check',
      'about:blank',
    ],
    { stdio: ['ignore', 'ignore', 'pipe'] }
  );
  const exited = new Promise<void>((resolve) => {
    chromiumProcess.once('exit', () => resolve());
    chromiumProcess.once('error', () => resolve());
  });
  let browser: Browser | undefined;
  try {
    const endpoint = await new Promise<string>((resolve, reject) => {
      const timeout = setTimeout(() => reject(new Error('Chromium startup timed out')), 10_000);
      const fail = (error: Error) => {
        clearTimeout(timeout);
        reject(error);
      };
      chromiumProcess.once('error', fail);
      chromiumProcess.once('exit', () => fail(new Error('Chromium exited during startup')));
      let stderr = '';
      chromiumProcess.stderr.on('data', (chunk: Buffer) => {
        stderr += chunk.toString();
        const match = /DevTools listening on (ws:\/\/\S+)/.exec(stderr);
        if (match) {
          clearTimeout(timeout);
          resolve(match[1]!);
        }
      });
    });
    browser = await chromium.connectOverCDP(endpoint, { noDefaults: true });
    const context = browser.contexts()[0]!;
    const page = context.pages()[0] ?? (await context.newPage());
    await page.goto(`${baseURL}/replay-lifecycle`);
    const initial = await snapshots(page);
    const cdp = await context.newCDPSession(page);
    await cdp.send('Page.setWebLifecycleState', { state: 'frozen' });
    await expect.poll(async () => (await state(page)).lifecycle.some((event) => event.name === 'freeze')).toBe(true);
    await cdp.send('Page.setWebLifecycleState', { state: 'active' });
    await page.bringToFront();
    const resumed = await snapshots(page, 2);
    expect(resumed.documentId).toBe(initial.documentId);
    expect(resumed.initializationId).toBe(initial.initializationId);
    expect(resumed.lifecycle.find((event) => event.name === 'freeze')).toMatchObject({
      trusted: true,
      checkpoint: { handoff: 'clean' },
    });
    expect(resumed.lifecycle.find((event) => event.name === 'resume')).toMatchObject({ trusted: true });
    expectContinuous(recordingEvents(resumed));
  } finally {
    chromiumProcess.kill('SIGTERM');
    const forceExit = setTimeout(() => chromiumProcess.kill('SIGKILL'), 3_000);
    await exited;
    clearTimeout(forceExit);
    await browser?.close();
    await rm(profile, { recursive: true, force: true, maxRetries: 8, retryDelay: 100 });
  }
});

for (const input of ['pointer', 'keyboard'] as const) {
  test(`recovers a genuinely abandoned pageswap on trusted ${input} input`, async ({ page }) => {
    await page.goto('/replay-lifecycle?mode=stop');
    const initial = await snapshots(page);
    await page.evaluate(() => {
      const result = window.navigation.navigate('/replay-lifecycle?name=b');
      void result.committed?.catch(() => {});
      void result.finished?.catch(() => {});
    });
    await expect.poll(async () => (await state(page)).lifecycle.some((event) => event.name === 'pageswap')).toBe(true);
    await expect.poll(async () => (await page.evaluate(() => navigator.locks.query())).held?.length).toBe(0);
    const stopped = await state(page);
    expect(stopped.documentId).toBe(initial.documentId);
    expect(stopped.initializationId).toBe(initial.initializationId);
    expect(stopped.checkpoint?.handoff).toBe('clean');
    expect(stopped.lifecycle.some((event) => event.name === 'pagehide')).toBe(false);
    await page.evaluate(async () => {
      document.dispatchEvent(new PointerEvent('pointerdown'));
      await new Promise(window.requestAnimationFrame);
    });
    expect((await state(page)).events.filter((event) => event.type === 2)).toHaveLength(1);
    if (input === 'pointer') {
      await page.locator('#interact').click();
    } else {
      await page.keyboard.press('a');
    }
    const resumed = await snapshots(page, 2);
    expect(resumed.documentId).toBe(initial.documentId);
    expect(resumed.initializationId).toBe(initial.initializationId);
    expectContinuous(recordingEvents(resumed));
  });
}

for (const mode of ['skip', 'hash-skip']) {
  test(`keeps native navigation working when the outbound transition uses ${mode}`, async ({ page }) => {
    await page.goto(`/replay-lifecycle?mode=${mode}`);
    const source = await snapshots(page);
    await page.locator('#next').click();
    const target = await snapshots(page);
    expect(target.documentId).not.toBe(source.documentId);
    expect(target.checkpoint?.recordingId).toBe(source.checkpoint?.recordingId);
    const clean = JSON.parse(target.initialCheckpoint!);
    expect(clean.handoff).toBe('clean');
    expect(clean.gen).toBe(0);
    expect(clean.nextSeq).toBeGreaterThanOrEqual(recordingEvents(source).length);
    expect(recordingEvents(target)[0]?.seq).toBe(clean.nextSeq);
  });
}

test('keeps an explicit active-state copy queued, cancels obsolete waiting work, and splits after release', async ({
  page,
  context,
}) => {
  await page.goto('/replay-lifecycle');
  const source = await snapshots(page);
  const copied = await context.newPage();
  await copied.goto('/replay-lifecycle?autostart=0');
  await copied.evaluate((checkpoint) => {
    window.sessionStorage.setItem(window.replayFixture.key, JSON.stringify(checkpoint));
    window.replayFixture.start();
  }, source.checkpoint);
  await expect.poll(async () => (await copied.evaluate(() => navigator.locks.query())).pending?.length).toBe(1);
  expect((await state(copied)).events).toEqual([]);
  await copied.evaluate(() => window.replayFixture.stop());
  await expect.poll(async () => (await copied.evaluate(() => navigator.locks.query())).pending?.length).toBe(0);
  await copied.evaluate(() => window.replayFixture.start());
  await expect.poll(async () => (await copied.evaluate(() => navigator.locks.query())).pending?.length).toBe(1);
  expect((await state(copied)).events).toEqual([]);
  await page.evaluate(() => window.replayFixture.stop());
  const recovered = await snapshots(copied);
  expect(recovered.checkpoint?.recordingId).not.toBe(source.checkpoint?.recordingId);
  expect(recordingEvents(recovered)[0]?.seq).toBe(0);
  const independent = await context.newPage();
  await independent.goto('/replay-lifecycle');
  const control = await snapshots(independent);
  expect(control.initialCheckpoint).toBeNull();
  expect(new Set([source, recovered, control].map((item) => item.checkpoint?.recordingId)).size).toBe(3);
});

test('documents the accepted native-lock collision from an explicit stale clean copy', async ({ page, context }) => {
  await page.goto('/replay-lifecycle');
  await snapshots(page);
  await page.evaluate(() => window.replayFixture.stop());
  await expect.poll(async () => (await page.evaluate(() => navigator.locks.query())).held?.length).toBe(0);
  const clean = (await state(page)).checkpoint!;
  expect(clean.handoff).toBe('clean');
  const copy = await context.newPage();
  await copy.goto('/replay-lifecycle?autostart=0');
  await copy.evaluate(
    (checkpoint) => window.sessionStorage.setItem(window.replayFixture.key, JSON.stringify(checkpoint)),
    clean
  );
  await page.evaluate(() => window.replayFixture.start());
  const advanced = await snapshots(page, 2);
  await page.evaluate(() => window.replayFixture.stop());
  await expect.poll(async () => (await page.evaluate(() => navigator.locks.query())).held?.length).toBe(0);
  await copy.evaluate(() => window.replayFixture.start());
  const stale = await snapshots(copy);
  const repeated = recordingEvents(stale)[0]!;
  expect(repeated).toMatchObject({ recording: clean.recordingId, seq: clean.nextSeq, gen: clean.gen + 1 });
  expect(recordingEvents(advanced)).toContainEqual(
    expect.objectContaining({
      recording: repeated.recording,
      seq: repeated.seq,
      gen: repeated.gen,
    })
  );
  expect((await copy.evaluate(() => navigator.locks.query())).held).toHaveLength(1);
});

test('reconciles a queued copied recording before acquiring for a new session', async ({ page, context }) => {
  await page.goto('/replay-lifecycle');
  const source = await snapshots(page);
  const copy = await context.newPage();
  await copy.goto('/replay-lifecycle?autostart=0');
  await copy.evaluate((checkpoint) => {
    window.sessionStorage.setItem(window.replayFixture.key, JSON.stringify(checkpoint));
    window.replayFixture.start();
  }, source.checkpoint);
  await expect.poll(async () => (await copy.evaluate(() => navigator.locks.query())).pending?.length).toBe(1);
  await copy.evaluate(() =>
    window.faro.api.setSession({ id: 'replacement-session', attributes: { isSampled: 'true' } })
  );
  const replacement = await snapshots(copy);
  expect(new Set(replacement.events.map((event) => event.session))).toEqual(new Set(['replacement-session']));
  expect(replacement.checkpoint?.recordingId).not.toBe(source.checkpoint?.recordingId);
  expect((await copy.evaluate(() => navigator.locks.query())).pending).toHaveLength(0);
  expect((await page.evaluate(() => navigator.locks.query())).held).toHaveLength(2);
});

for (const failure of ['read', 'write']) {
  test(`keeps document-local counters through replacement during storage ${failure} failures`, async ({ page }) => {
    await page.goto(`/replay-lifecycle?storage=${failure}`);
    const initial = await snapshots(page);
    await page.evaluate(() => window.replayFixture.replace());
    const replaced = await snapshots(page, 2);
    expectContinuous(recordingEvents(replaced));
    expect((await page.evaluate(() => navigator.locks.query())).held).toHaveLength(1);
    await page.goto(`/replay-lifecycle?storage=${failure}&name=next`);
    const next = await snapshots(page);
    expect(next.documentId).not.toBe(initial.documentId);
    expect(recordingEvents(next)[0]!.recording).not.toBe(recordingEvents(initial)[0]!.recording);
    expect(recordingEvents(next)[0]?.seq).toBe(0);
  });
}

test('keeps failed final persistence local and splits the next native document', async ({ page }) => {
  await page.goto('/replay-lifecycle');
  const initial = await snapshots(page);
  await page.evaluate(() => {
    window.replayFixture.storageFailure(false, true);
    window.replayFixture.stop();
  });
  await expect.poll(async () => (await page.evaluate(() => navigator.locks.query())).held?.length).toBe(0);
  expect((await state(page)).checkpoint?.handoff).toBe('active');
  await page.evaluate(() => window.replayFixture.start());
  const replaced = await snapshots(page, 2);
  expectContinuous(recordingEvents(replaced));
  await page.evaluate(() => window.replayFixture.stop());
  await expect.poll(async () => (await page.evaluate(() => navigator.locks.query())).held?.length).toBe(0);
  await page.goto('/replay-lifecycle?name=next');
  const next = await snapshots(page);
  expect(JSON.parse(next.initialCheckpoint!).handoff).toBe('active');
  expect(next.checkpoint?.recordingId).not.toBe(initial.checkpoint?.recordingId);
  expect(recordingEvents(next)[0]?.seq).toBe(0);
});
