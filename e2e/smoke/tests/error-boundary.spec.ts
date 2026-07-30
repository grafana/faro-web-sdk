import { expect, test } from './fixtures';

test.describe('Smoke / FaroErrorBoundary', () => {
  test('captures and pushes errors thrown inside a FaroErrorBoundary', async ({ page, collector }) => {
    await page.goto('/');
    await page.locator('[data-cy="btn-throw-error"]').click();

    const exception = await collector.waitForMatch((b) =>
      b.exceptions?.find((e) => e.value === 'smoke harness boundary error')
    );

    expect(exception.type).toBeTruthy();
  });
});
