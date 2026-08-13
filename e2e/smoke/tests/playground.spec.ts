import { expect, test } from '@playwright/test';

/**
 * The playground page exercises the API on the path a bundler user takes. This spec is the automated
 * half of that page: it opens it and requires that nothing failed. When it does fail, the rendered
 * table is attached to the report so the reason is visible without reproducing anything.
 */
test.describe('Playground', () => {
  test('every customer journey passes on the bundler path', async ({ page }) => {
    const pageErrors: string[] = [];
    page.on('pageerror', (error) => pageErrors.push(String(error)));

    await page.goto('/playground.html');
    await page.waitForFunction(() => window.__checksReady === true, undefined, { timeout: 30_000 });

    const results = await page.evaluate(() => window.__checkResults ?? []);
    const failed = results.filter((result) => !result.passed);

    if (failed.length) {
      await test.info().attach('playground-results', {
        body: results
          .map((r) => `${r.passed ? 'pass' : 'FAIL'}  ${r.name}${r.error ? `\n      ${r.error}` : ''}`)
          .join('\n'),
        contentType: 'text/plain',
      });
    }

    expect(results.length, 'the page ran no checks at all').toBeGreaterThan(10);
    expect(failed.map((result) => `${result.name}: ${result.error?.split('\n')[0]}`)).toEqual([]);

    // A page error that no check happened to catch still means something is broken. React's error
    // boundary check deliberately throws, and React re-reports that through window.onerror, so allow it.
    const unexpected = pageErrors.filter((message) => !message.includes('playground boundary error'));
    expect(unexpected, 'the page reported errors outside of any check').toEqual([]);
  });
});
