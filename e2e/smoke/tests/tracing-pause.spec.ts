import type { Faro } from '@grafana/faro-core';

import { expect, test } from './fixtures';

declare global {
  interface Window {
    faro: Faro;
  }
}

test.describe('Smoke / tracing while paused', () => {
  test('stops adding traceparent to requests while paused', async ({ page }) => {
    const traceparents: Array<string | undefined> = [];

    await page.route('**/api/ping', async (route) => {
      traceparents.push(route.request().headers()['traceparent']);
      await route.fulfill({ status: 200, body: '{}' });
    });

    await page.goto('/');

    const fetchOnce = async () => {
      const request = page.waitForRequest('**/api/ping');
      await page.locator('[data-cy="btn-traced-fetch"]').click();
      await request;
    };

    await fetchOnce();
    expect(traceparents[0]).toMatch(/^00-[0-9a-f]{32}-[0-9a-f]{16}-[0-9a-f]{2}$/);

    await page.evaluate(() => window.faro.pause());
    await fetchOnce();
    expect(traceparents[1]).toBeUndefined();

    await page.evaluate(() => window.faro.unpause());
    await fetchOnce();
    expect(traceparents[2]).toMatch(/^00-[0-9a-f]{32}-[0-9a-f]{16}-[0-9a-f]{2}$/);
  });
});
