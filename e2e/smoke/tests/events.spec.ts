import { expect, test } from './fixtures';

test.describe('Smoke / events', () => {
  test('pushes an event with the expected name and attributes', async ({ page, collector }) => {
    await page.goto('/');
    await page.locator('[data-cy="btn-push-event"]').click();

    const event = await collector.waitForMatch((b) => b.events?.find((e) => e.name === 'smoke-harness-event'));

    expect(event.attributes?.['source']).toBe('smoke-harness');
  });
});
