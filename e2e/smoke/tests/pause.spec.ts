import type { Faro } from '@grafana/faro-core';

import { expect, test } from './fixtures';

declare global {
  interface Window {
    faro: Faro;
  }
}

test.describe('Smoke / pause', () => {
  test('exposes the paused state on the global faro instance', async ({ page, collector }) => {
    await page.goto('/');

    const readConfigPaused = () => page.evaluate(() => window.faro.config.paused);

    expect(await readConfigPaused()).toBe(false);

    await page.evaluate(() => window.faro.pause());
    expect(await readConfigPaused()).toBe(true);

    await page.evaluate(() => window.faro.unpause());
    expect(await readConfigPaused()).toBe(false);

    // ingestion resumes once unpaused
    await page.locator('[data-cy="btn-push-log"]').click();

    const log = await collector.waitForMatch((b) => b.logs?.find((l) => l.message === 'smoke harness log'));

    expect(log.level).toBe('info');
  });
});
