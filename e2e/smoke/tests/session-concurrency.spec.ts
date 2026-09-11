import { expect, type Page, type Route, test } from '@playwright/test';

import type { Faro, TransportBody } from '@grafana/faro-core';

interface SessionObservation {
  callbacks: Array<{ previous: string | undefined; next: string | undefined }>;
  events: Array<{ name: string; session: string | undefined; recording: string | undefined }>;
}

declare global {
  interface Window {
    GrafanaFaroWebSdk: typeof import('@grafana/faro-web-sdk');
    GrafanaFaroInstrumentationReplay: typeof import('@grafana/faro-instrumentation-replay');
    sessionObservation: SessionObservation;
    faro: Faro;
  }
}

async function observe(page: Page) {
  return page.evaluate(() => {
    const target = window;
    return {
      ...target.sessionObservation,
      memory: target.faro.api.getSession()?.id,
      stored: JSON.parse(window.localStorage.getItem('com.grafana.faro.session') ?? 'null')?.sessionId as
        string | undefined,
    };
  });
}

test('concurrent persistent-session invalidations converge on subsequent capture', async ({ browser }) => {
  const context = await browser.newContext();
  const pending: Route[] = [];
  const invalidated: TransportBody[] = [];
  try {
    await context.route('**/session-concurrency', (route) =>
      route.fulfill({ contentType: 'text/html', body: '<!doctype html><title>Session concurrency</title>' })
    );
    await context.route('**/collect-concurrency', async (route) => {
      const body = route.request().postDataJSON() as TransportBody;
      if (body.events?.some((event) => event.name === 'concurrent-renewal')) {
        invalidated.push(body);
        pending.push(route);
        return;
      }
      await route.fulfill({ status: 201, body: '{}' });
    });

    const pages: Page[] = [];
    for (let tab = 0; tab < 2; tab++) {
      const page = await context.newPage();
      await page.goto('/session-concurrency');
      await page.addScriptTag({ url: '/bundles/faro-web-sdk.iife.js' });
      await page.addScriptTag({ url: '/bundles/faro-instrumentation-replay.iife.js' });
      await page.evaluate(() => {
        const target = window;
        const { initializeFaro, SessionInstrumentation } = target.GrafanaFaroWebSdk;
        const { ReplayInstrumentation } = target.GrafanaFaroInstrumentationReplay;
        const observation: SessionObservation = { callbacks: [], events: [] };
        target.sessionObservation = observation;
        initializeFaro({
          url: '/collect-concurrency',
          app: { name: 'session-concurrency' },
          batching: { enabled: false },
          instrumentations: [
            new SessionInstrumentation(),
            new ReplayInstrumentation({ samplingRate: 1, inactivityThresholdMs: 0 }),
          ],
          sessionTracking: {
            enabled: true,
            persistent: true,
            session: { id: 'session-A' },
            samplingRate: 1,
            onSessionChange: (previous, next) => {
              observation.callbacks.push({ previous: previous?.id, next: next.id });
            },
          },
          beforeSend: (item) => {
            if (item.type === 'event') {
              const event = item.payload as NonNullable<TransportBody['events']>[number];
              observation.events.push({
                name: event.name,
                session: item.meta.session?.id,
                recording: event.attributes?.['recording_id'],
              });
            }
            return item;
          },
        });
      });
      await expect
        .poll(async () => (await observe(page)).events.some((event) => event.name === 'faro.session_recording.started'))
        .toBe(true);
      expect((await observe(page)).memory).toBe('session-A');
      pages.push(page);
    }

    // Await the real transport sends so both response handlers finish before
    // measuring. Only collector responses are controlled; storage is native.
    const sends = pages.map((page) =>
      page.evaluate(async () => {
        const target = window;
        await target.faro.transports.transports[0]!.send([
          {
            type: target.GrafanaFaroWebSdk.TransportItemType.EVENT,
            meta: target.faro.metas.value,
            payload: { name: 'concurrent-renewal', timestamp: new Date().toISOString() },
          },
        ]);
      })
    );
    await expect.poll(() => pending.length).toBe(2);
    expect(invalidated.map((body) => body.meta.session?.id)).toEqual(['session-A', 'session-A']);
    await Promise.all(
      pending.map((route) =>
        route.fulfill({ status: 202, headers: { 'X-Faro-Session-Status': 'invalid' }, body: '{}' })
      )
    );
    await Promise.all(sends);
    await expect
      .poll(async () => new Set(await Promise.all(pages.map(async (page) => (await observe(page)).stored))).size)
      .toBe(1);
    const afterInvalidation = await Promise.all(pages.map(observe));
    const settledSession = afterInvalidation[0]!.stored;
    expect(settledSession).toBeTruthy();
    expect(settledSession).not.toBe('session-A');

    // Reconciliation is driven by capture/visibility and throttled to one
    // second. Elapsing that interval alone does not promise convergence.
    await pages[0]!.waitForTimeout(1_100);
    await Promise.all(pages.map((page) => page.evaluate(() => window.faro.api.pushEvent('after-renewal'))));
    await expect
      .poll(async () =>
        Promise.all(
          pages.map(
            async (page) => (await observe(page)).events.find((event) => event.name === 'after-renewal')?.session
          )
        )
      )
      .toEqual([settledSession, settledSession]);
    await expect
      .poll(async () =>
        Promise.all(
          pages.map(
            async (page) =>
              (await observe(page)).events.filter((event) => event.name === 'faro.session_recording.started').at(-1)
                ?.session
          )
        )
      )
      .toEqual([settledSession, settledSession]);

    const afterCapture = await Promise.all(pages.map(observe));
    expect(afterCapture.map((state) => state.callbacks)).toEqual(afterInvalidation.map((state) => state.callbacks));
    for (const state of afterCapture) {
      expect(state.memory).toBe(settledSession);
      expect(state.stored).toBe(settledSession);
      for (const recording of new Set(state.events.map((event) => event.recording).filter(Boolean))) {
        const sessions = new Set(
          state.events.filter((event) => event.recording === recording).map((event) => event.session)
        );
        expect(sessions.size, 'a recording must retain one captured session').toBe(1);
      }
    }
    await test.info().attach('session-concurrency', {
      contentType: 'application/json',
      body: JSON.stringify({ browser: browser.version(), afterInvalidation, afterCapture }, null, 2),
    });
  } finally {
    await context.close();
  }
});
