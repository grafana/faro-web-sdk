import { expect, test } from './fixtures';

test.describe('Smoke / init', () => {
  test('populates browser and app meta on transport POSTs', async ({ page, collector }) => {
    await page.goto('/');

    const body = await collector.waitForMatch((b) =>
      b.meta.browser?.name && b.meta.browser?.userAgent && b.meta.app?.name === 'faro-web-sdk-smoke' ? b : undefined
    );

    expect(body.meta.app?.name).toBe('faro-web-sdk-smoke');
    expect(body.meta.browser?.name).toBeTruthy();
    expect(body.meta.browser?.userAgent).toBeTruthy();
  });
});
