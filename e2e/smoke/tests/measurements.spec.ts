import { expect, test } from './fixtures';

test.describe('Smoke / measurements', () => {
  test('pushes a measurement with the expected type and values', async ({ page, collector }) => {
    await page.goto('/');
    await page.locator('[data-cy="btn-push-measurement"]').click();

    const measurement = await collector.waitForMatch((b) =>
      b.measurements?.find((m) => m.type === 'smoke-harness-measurement')
    );

    expect(measurement.values['duration']).toBe(42);
    expect(measurement.values['count']).toBe(1);
  });
});
