import { expect, test } from '@playwright/test';

/**
 * Guards the content delivery network path, which nothing covered before.
 *
 * `faro-react.iife.js` shipped broken for some time: it contained `process.env.NODE_ENV`, which does
 * not exist in a browser, so it threw before defining its global. The bundler specs could not see it
 * because a bundler replaces that expression at build time. This spec loads the real published
 * bundles with script tags instead.
 */
test.describe('Content delivery network bundles', () => {
  test('every bundle loads from a script tag and the journeys pass', async ({ page }) => {
    const pageErrors: string[] = [];
    page.on('pageerror', (error) => pageErrors.push(String(error)));

    await page.goto('/cdn.html');
    await page.waitForFunction(() => window.__checksReady === true, undefined, { timeout: 30_000 });

    const results = await page.evaluate(() => window.__checkResults ?? []);
    const failed = results.filter((result) => !result.passed);

    if (failed.length) {
      await test.info().attach('cdn-results', {
        body: results
          .map((r) => `${r.passed ? 'pass' : 'FAIL'}  ${r.name}${r.error ? `\n      ${r.error}` : ''}`)
          .join('\n'),
        contentType: 'text/plain',
      });
    }

    expect(results.length, 'the page ran no checks at all').toBeGreaterThan(6);
    expect(failed.map((result) => `${result.name}: ${result.error?.split('\n')[0]}`)).toEqual([]);
    expect(pageErrors, 'a bundle threw while evaluating').toEqual([]);
  });
});
