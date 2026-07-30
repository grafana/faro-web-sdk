import { expect, test } from './fixtures';

test.describe('Smoke / transport', () => {
  test('pushes a log entry with the expected payload shape', async ({ page, collector }) => {
    await page.goto('/');
    await page.locator('[data-cy="btn-push-log"]').click();

    const log = await collector.waitForMatch((b) => b.logs?.find((l) => l.message === 'smoke harness log'));

    expect(log.level).toBe('info');
  });
});
