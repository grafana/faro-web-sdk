import { expect, test } from './fixtures';

test.describe('Smoke / transport', () => {
  test('retries with stable request identity using the default transport', async ({ page }) => {
    const attempts: Array<{ body: string; key: string; session: string }> = [];
    await page.route('**/collect', async (route) => {
      const request = route.request();
      const body = request.postDataJSON();
      if (body.logs?.some((log: { message: string }) => log.message === 'smoke harness log')) {
        attempts.push({
          body: request.postData()!,
          key: request.headers()['idempotency-key']!,
          session: request.headers()['x-faro-session-id']!,
        });
        await route.fulfill({ status: attempts.length === 1 ? 503 : 202, body: '{}' });
        return;
      }
      await route.fulfill({ status: 202, body: '{}' });
    });

    await page.goto('/');
    await page.locator('[data-cy="btn-push-log"]').click();
    await expect.poll(() => attempts.length).toBe(2);
    expect(attempts[0]!.key).toBeTruthy();
    expect(attempts[1]).toEqual(attempts[0]);
    expect(attempts[0]!.session).toBe(JSON.parse(attempts[0]!.body).meta.session.id);
  });

  test('pushes a log entry with the expected payload shape', async ({ page, collector }) => {
    await page.goto('/');
    await page.locator('[data-cy="btn-push-log"]').click();

    const log = await collector.waitForMatch((b) => b.logs?.find((l) => l.message === 'smoke harness log'));

    expect(log.level).toBe('info');
  });
});
