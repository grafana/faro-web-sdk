import type { TransportBody } from '@grafana/faro-core';

import { expect, test } from './fixtures';

type Span = { name?: string };

function allSpans(bodies: TransportBody[]): Span[] {
  return bodies.flatMap((body) =>
    ((body.traces?.resourceSpans ?? []) as Array<Record<string, any>>)
      .flatMap((resourceSpan) => (resourceSpan['scopeSpans'] ?? []) as Array<Record<string, any>>)
      .flatMap((scopeSpan) => (scopeSpan['spans'] ?? []) as Span[])
  );
}

test.describe('Smoke / self-tracing', () => {
  // The harness is configured with a relative collector url, which is the setup reported in
  // issue #426: a relative url is not an exact match for the request url the browser resolves,
  // so Faro traced its own collector requests and each export produced more spans to export.
  test('does not trace its own collector requests when the collector url is relative', async ({ page }) => {
    const bodies: TransportBody[] = [];

    await page.route('**/collect', async (route) => {
      bodies.push(route.request().postDataJSON() as TransportBody);
      await route.fulfill({ status: 201, body: '{}' });
    });

    await page.goto('/');

    // several signals, so the transport posts to the relative collector url more than once
    await page.locator('[data-cy="btn-push-log"]').click();
    await page.locator('[data-cy="btn-push-event"]').click();
    await page.locator('[data-cy="btn-emit-span"]').click();

    // Wait until a span has actually been exported. Without this the assertion below would also
    // pass if tracing were simply inactive, which would make the test worthless.
    await expect
      .poll(() => allSpans(bodies).some((span) => span.name === 'smoke-harness-span'), { timeout: 10_000 })
      .toBe(true);

    const collectorSpans = allSpans(bodies).filter((span) => JSON.stringify(span).includes('/collect'));

    expect(collectorSpans).toEqual([]);
  });
});
