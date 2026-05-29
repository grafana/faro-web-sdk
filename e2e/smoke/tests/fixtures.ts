import { test as base, type Page } from '@playwright/test';

import type { TransportBody } from '@grafana/faro-core';

export { expect } from '@playwright/test';

/**
 * Intercept all POST requests to /collect.
 *
 * Returns a helper that waits for the first payload matching a predicate,
 * mirroring the Cypress `interceptCollector` + `cy.wait` pattern.
 */
async function mockCollector(page: Page) {
  const bodies: TransportBody[] = [];
  let waiting: { resolve: (body: TransportBody) => void; predicate: (body: TransportBody) => boolean } | null = null;

  await page.route('**/collect', async (route) => {
    const body = route.request().postDataJSON() as TransportBody;
    bodies.push(body);

    if (waiting && waiting.predicate(body)) {
      waiting.resolve(body);
      waiting = null;
    }

    await route.fulfill({ status: 201, body: '{}' });
  });

  return {
    /**
     * Resolve with the first value extracted from a /collect payload.
     *
     * `extract` is called on every intercepted payload (past and future).
     * The first non-`undefined` return value resolves the promise, already
     * narrowed to `T` — no post-hoc `.find()` or `!` assertion needed.
     */
    waitForMatch<T>(extract: (body: TransportBody) => T | undefined, timeoutMs = 5_000): Promise<T> {
      for (const body of bodies) {
        const match = extract(body);
        if (match !== undefined) {
          return Promise.resolve(match);
        }
      }

      return new Promise<T>((resolve, reject) => {
        const timer = setTimeout(
          () =>
            reject(
              new Error(
                `waitForMatch timed out after ${timeoutMs}ms. ${bodies.length} payload(s) received, none matched.`
              )
            ),
          timeoutMs
        );
        waiting = {
          predicate: (body) => extract(body) !== undefined,
          resolve: (body) => {
            clearTimeout(timer);
            resolve(extract(body) as T);
          },
        };
      });
    },
  };
}

export const test = base.extend<{ collector: Awaited<ReturnType<typeof mockCollector>> }>({
  collector: async ({ page }, use) => {
    const collector = await mockCollector(page);
    await use(collector);
  },
});
