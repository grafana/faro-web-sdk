import type { Frame, Page } from '@playwright/test';

import type { Faro, TransportBody } from '@grafana/faro-core';

import { expect, test } from './fixtures';

const STORAGE_KEY = 'com.grafana.faro.session';

for (const persistent of [false, true]) {
  test(`same-origin iframe adopts a rotated session (persistent=${persistent})`, async ({ page }) => {
    const bodies: TransportBody[] = [];
    await page.route('**/collect', async (route) => {
      bodies.push(route.request().postDataJSON() as TransportBody);
      await route.fulfill({ status: 201, body: '{}' });
    });
    await page.route('**/session-iframe.html*', (route) =>
      route.fulfill({
        contentType: 'text/html',
        body: `<!doctype html>
          <script src="/bundles/faro-web-sdk.iife.js"></script>
          <script>
            const { initializeFaro, SessionInstrumentation } = GrafanaFaroWebSdk;
            initializeFaro({
              url: '/collect',
              app: { name: 'session-iframe' },
              instrumentations: [new SessionInstrumentation()],
              sessionTracking: { enabled: true, persistent: ${persistent}, samplingRate: 1 },
              batching: { enabled: false }
            });
          </script>`,
      })
    );

    const sessionId = (document: Page | Frame) =>
      document.evaluate(() => (window as typeof window & { faro: Faro }).faro.api.getSession()?.id);
    const sendLog = (document: Page | Frame, message: string) =>
      document.evaluate((message) => (window as typeof window & { faro: Faro }).faro.api.pushLog([message]), message);
    const logSessionId = (message: string) =>
      bodies.find((body) => body.logs?.some((log) => log.message === message))?.meta.session?.id;

    await page.goto('/session-iframe.html');
    const initialId = await sessionId(page);
    expect(initialId).toBeTruthy();
    await page.evaluate(() => {
      const iframe = document.createElement('iframe');
      iframe.src = '/session-iframe.html?child';
      document.body.appendChild(iframe);
    });
    await expect.poll(() => page.frames().length).toBe(2);
    const child = page.frames()[1]!;
    await child.waitForFunction(() => Boolean(window.faro));
    expect(await sessionId(child)).toBe(initialId);

    // Let the storage-check interval lapse, then simulate 16 minutes of inactivity.
    await page.waitForTimeout(2_500);
    await page.evaluate(
      ({ key, persistent }) => {
        const storage = persistent ? window.localStorage : window.sessionStorage;
        const stored = JSON.parse(storage.getItem(key)!);
        storage.setItem(key, JSON.stringify({ ...stored, lastActivity: Date.now() - 16 * 60 * 1000 }));
      },
      { key: STORAGE_KEY, persistent }
    );

    await sendLog(page, 'parent-after-inactivity');
    const rotatedId = await sessionId(page);
    expect(rotatedId).toBeTruthy();
    expect(rotatedId).not.toBe(initialId);
    await expect.poll(() => logSessionId('parent-after-inactivity')).toBe(rotatedId);

    await sendLog(child, 'iframe-after-rotation');
    await expect.poll(() => logSessionId('iframe-after-rotation')).toBe(rotatedId);
    expect(await sessionId(child)).toBe(rotatedId);
  });
}
