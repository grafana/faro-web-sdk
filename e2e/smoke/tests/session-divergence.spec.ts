import { type Page } from '@playwright/test';

import type { TransportBody } from '@grafana/faro-core';

import { expect, test } from './fixtures';

// Cross-tab session convergence (regression guard).
//
// Persistent sessions are shared via localStorage. When one tab rotates the
// session, a background tab must adopt the new id rather than keep emitting the
// expired one. Asserts: after Tab A rotates, Tab B's next emit carries the rotated id.
//
// Force expiry by ageing the stored session, then let the one-second
// reconciliation interval elapse. The next accepted capture rotates or adopts
// the session before assigning ownership to the triggering signal.

const URL = '/?session=persistent';
const RECONCILIATION_LAPSE_MS = 2_500;

const EVENT_BTN = '[data-cy="btn-push-event"]';
const LOG_BTN = '[data-cy="btn-push-log"]';
const STORAGE_KEY = 'com.grafana.faro.session';

// Capture the session id carried by every /collect payload this page sends.
async function collectSessionIds(page: Page): Promise<string[]> {
  const ids: string[] = [];
  await page.route('**/collect', async (route) => {
    const body = route.request().postDataJSON() as TransportBody;
    const id = body?.meta?.session?.id;
    if (id) {
      ids.push(id);
    }
    await route.fulfill({ status: 201, body: '{}' });
  });
  return ids;
}

// The session id persisted in shared localStorage (where a rotation lands).
function storageSessionId(page: Page): Promise<string | null> {
  return page.evaluate((key) => {
    const raw = window.localStorage.getItem(key);
    return raw ? (JSON.parse(raw).sessionId as string) : null;
  }, STORAGE_KEY);
}

// Make the shared stored session look expired (started at epoch) so the next tab
// to send rotates it — without waiting out the real lifetime cap.
async function expireStoredSession(page: Page): Promise<void> {
  await page.evaluate((key) => {
    const raw = window.localStorage.getItem(key);
    if (raw) {
      window.localStorage.setItem(key, JSON.stringify({ ...JSON.parse(raw), started: 0 }));
    }
  }, STORAGE_KEY);
}

// Bring the tab to the front, click a signal button, and wait until the
// resulting /collect payload is captured (so session reconciliation has run).
// Returns the session id that payload carried — i.e. the tab's in-memory id.
async function clickAndCapture(page: Page, sink: string[], button: string): Promise<string> {
  const before = sink.length;
  await page.bringToFront();
  await page.locator(button).click();
  await expect.poll(() => sink.length, { timeout: 5_000 }).toBeGreaterThan(before);
  return sink[sink.length - 1]!;
}

test('a background tab converges to the rotated session instead of emitting the expired id', async ({ browser }) => {
  const context = await browser.newContext(); // one context => shared localStorage
  try {
    // --- Tab A establishes session S0 ---
    const tabA = await context.newPage();
    const aIds = await collectSessionIds(tabA);
    await tabA.goto(URL);
    await tabA.locator(EVENT_BTN).waitFor();
    const s0 = await clickAndCapture(tabA, aIds, EVENT_BTN);
    expect(s0, 'Tab A establishes an initial session').toBeTruthy();

    // --- Tab B resumes S0 from shared storage ---
    const tabB = await context.newPage();
    const bIds = await collectSessionIds(tabB);
    await tabB.goto(URL);
    await tabB.locator(EVENT_BTN).waitFor();
    expect(await clickAndCapture(tabB, bIds, EVENT_BTN), 'Tab B resumes S0 from shared localStorage').toBe(s0);

    // Let reconciliation run again, then expire the shared session.
    await tabA.waitForTimeout(RECONCILIATION_LAPSE_MS);
    await expireStoredSession(tabA);

    // --- Tab A emits first (log = a fresh signal) -> rotates to A1 in storage ---
    await clickAndCapture(tabA, aIds, LOG_BTN);
    const a1 = await storageSessionId(tabA);
    expect(a1, 'Tab A rotates to a new session when the stored one is expired').not.toBe(s0);
    expect(await storageSessionId(tabB), 'shared storage now holds A1 for both tabs').toBe(a1);

    // Tab B reconciles before capturing its signal, so its first post-rotation
    // send carries A1. Missing adoption or another rotation would produce a
    // different session ID.
    const bConverged = await clickAndCapture(tabB, bIds, LOG_BTN);
    expect(bConverged, 'background tab converges to the shared session, not the expired one').toBe(a1);
  } finally {
    await context.close();
  }
});
