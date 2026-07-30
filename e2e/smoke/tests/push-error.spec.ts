import { expect, test } from './fixtures';

test.describe('Smoke / pushError', () => {
  test('pushes an exception via the faro.api.pushError API', async ({ page, collector }) => {
    await page.goto('/');
    await page.locator('[data-cy="btn-push-error"]').click();

    const exception = await collector.waitForMatch((b) =>
      b.exceptions?.find((e) => e.value === 'smoke harness pushError')
    );

    expect(exception.type).toBe('Error');
  });
});
