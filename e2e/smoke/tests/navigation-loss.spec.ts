import type { APIRequestContext, Page, TestInfo } from '@playwright/test';
import { randomUUID } from 'node:crypto';

import type { TransportBody } from '@grafana/faro-core';

import type { TimelineEntry } from '../src/navigationLoss';

import { expect, test } from './fixtures';

// Issue #2315: a failed fetch shortly before navigation can leave no client span or
// `faro.tracing.fetch` event in the collector payload.
//
// navigation-loss.html runs the real SDK: the app fetches an endpoint that returns 500 and, on seeing
// the error, assigns `location`. The Vite harness records what reaches `/collect/<run>`, so these
// specs assert on what a collector receives, including requests sent while the page unloads.
//
// The server can hold the navigation response (`hold=1`), so a spec decides when the old page unloads
// by releasing it once the span reaches a given stage. No timers are faked and nothing sleeps.
//
// Telemetry from the failed request passes through these stages. A navigation can catch it in any one:
//   1. OTel fetch instrumentation reads the body, then ends the span 300 ms later.
//   2. OTel's BatchSpanProcessor exports ended spans into Faro every 1000 ms, or when the page is hidden.
//   3. Faro's batch hands items to the transport every 250 ms, or when the page is hidden.
//   4. The fetch transport sends them, with keepalive while the page unloads.

// Payloads sent during unload arrive within milliseconds. This bounds the wait for one that never comes.
const DELIVERY_TIMEOUT_MS = 3_000;

interface Delivered {
  clientSpan: boolean;
  fetchEvent: boolean;
}

interface Collected {
  receivedAtMs: number;
  body: TransportBody;
}

function failPath(run: string): string {
  return `/__repro/fail/${run}`;
}

async function collected(request: APIRequestContext, run: string): Promise<Collected[]> {
  const response = await request.get(`/__repro/collected/${run}`);
  return (await response.json()) as Collected[];
}

function findFailSpan(payloads: Collected[], run: string) {
  return payloads
    .flatMap(({ body }) => body.traces?.resourceSpans ?? [])
    .flatMap((resourceSpans) => resourceSpans.scopeSpans ?? [])
    .flatMap((scopeSpans) => scopeSpans.spans ?? [])
    .find((span) =>
      (span.attributes ?? []).some((attribute) => JSON.stringify(attribute.value).includes(failPath(run)))
    );
}

function findFetchEvent(payloads: Collected[], run: string) {
  return payloads
    .flatMap(({ body }) => body.events ?? [])
    .find(
      (event) =>
        event.name === 'faro.tracing.fetch' &&
        Object.values(event.attributes ?? {}).some((value) => String(value).includes(failPath(run)))
    );
}

async function delivered(request: APIRequestContext, run: string): Promise<Delivered> {
  const payloads = await collected(request, run);
  return {
    clientSpan: findFailSpan(payloads, run) !== undefined,
    fetchEvent: findFetchEvent(payloads, run) !== undefined,
  };
}

/** What issue #2315 expects: the client span with its error status, and one matching event. */
async function expectDelivered(request: APIRequestContext, run: string): Promise<void> {
  await expect
    .poll(() => delivered(request, run), { timeout: DELIVERY_TIMEOUT_MS })
    .toEqual({ clientSpan: true, fetchEvent: true });

  const payloads = await collected(request, run);
  const span = findFailSpan(payloads, run)!;
  const event = findFetchEvent(payloads, run)!;
  expect(span.kind).toBe(3); // CLIENT
  expect(span.status?.code).toBe(2); // ERROR
  expect(event.trace?.span_id).toBe(span.spanId);
  expect(payloads.flatMap(({ body }) => body.events ?? []).filter((e) => e.name === 'faro.tracing.fetch')).toHaveLength(
    1
  );
}

interface ReproOptions {
  /** Hold the navigation response until a release. */
  hold?: boolean;
  /** With `hold`, the page releases the navigation when it records this timeline entry. */
  releaseAt?: string;
  /** False runs the page without its observers. */
  observe?: boolean;
}

async function openRepro(page: Page, options: ReproOptions = {}): Promise<string> {
  const run = randomUUID().replaceAll('-', '');
  const query = new URLSearchParams({ run });
  if (options.hold) {
    query.set('hold', '1');
  }
  if (options.releaseAt) {
    query.set('releaseAt', options.releaseAt);
  }
  if (options.observe === false) {
    query.set('observe', '0');
  }
  await page.goto(`/navigation-loss.html?${query}`);
  await page.waitForFunction(() => window.faroNavigationRepro !== undefined);
  return run;
}

/** Fetch the failing endpoint. The app navigates when it sees the 500. */
async function startFailedFetch(page: Page): Promise<void> {
  await page.evaluate(() => window.faroNavigationRepro!.start());
}

function waitForLanding(page: Page, run: string): Promise<void> {
  return page.waitForURL(`**/__repro/landed/${run}**`);
}

function readTimeline(page: Page, run: string): Promise<TimelineEntry[]> {
  return page.evaluate(
    (key) => JSON.parse(window.sessionStorage.getItem(key) ?? '[]') as TimelineEntry[],
    `faro-navigation-repro:${run}`
  );
}

/** The timeline relative to the app's fetch, with server arrivals merged in. Attached to the result. */
async function attachTimeline(testInfo: TestInfo, page: Page, request: APIRequestContext, run: string) {
  const timeline = await readTimeline(page, run);
  const payloads = await collected(request, run);
  const origin = timeline.find((entry) => entry.name === 'app: fetch')?.atMs ?? timeline[0]?.atMs ?? 0;

  const lines = [
    ...timeline.map(({ atMs, name, ...detail }) => ({ atMs, text: `${name} ${JSON.stringify(detail)}` })),
    ...payloads.map(({ receivedAtMs, body }) => ({
      atMs: receivedAtMs,
      text: `server: payload received ${JSON.stringify({
        kinds: Object.keys(body).filter((key) => key !== 'meta'),
        clientSpan: findFailSpan([{ receivedAtMs, body }], run) !== undefined,
        fetchEvent: findFetchEvent([{ receivedAtMs, body }], run) !== undefined,
      })}`,
    })),
  ]
    .sort((left, right) => left.atMs - right.atMs)
    .map(({ atMs, text }) => `${(atMs - origin).toFixed(1).padStart(9)} ms  ${text}`)
    .join('\n');

  await testInfo.attach('timeline', { body: lines, contentType: 'text/plain' });
  if (process.env['REPRO_VERBOSE']) {
    console.log(`\n[${testInfo.project.use.browserName ?? 'browser'}] ${testInfo.title}\n${lines}`);
  }
  return timeline;
}

/** The timeline entries recorded before the page started to unload. */
function beforeUnload(timeline: TimelineEntry[]): TimelineEntry[] {
  const unloadStart = timeline.findIndex(({ name }) => name === 'pagehide: before SDK');
  return unloadStart === -1 ? timeline : timeline.slice(0, unloadStart + 1);
}

const SPAN_ENDED = 'otel: fail span ended';
const EXPORTED_TO_FARO = 'faro: OTel exported spans into Faro';

test.describe('Navigation telemetry loss (#2315)', () => {
  for (const observe of [false, true]) {
    test(`delivers the span and event when the app navigates on seeing the error${observe ? ' (observed)' : ''}`, async ({
      page,
      request,
    }, testInfo) => {
      const run = await openRepro(page, { observe });

      await startFailedFetch(page);
      await waitForLanding(page, run);

      if (observe) {
        await attachTimeline(testInfo, page, request, run);
      }
      await expectDelivered(request, run);
    });
  }

  test.describe('where the telemetry is when the page unloads', () => {
    test('control: delivers both while the navigation is held', async ({ page, request }, testInfo) => {
      const run = await openRepro(page, { hold: true });

      await startFailedFetch(page);
      await expect.poll(() => delivered(request, run)).toEqual({ clientSpan: true, fetchEvent: true });
      expect((await request.post(`/__repro/release/${run}`)).status()).toBe(204);
      await waitForLanding(page, run);

      await attachTimeline(testInfo, page, request, run);
      await expectDelivered(request, run);
    });

    test('span ended, not yet exported by OTel', async ({ page, request }, testInfo) => {
      const run = await openRepro(page, { hold: true, releaseAt: SPAN_ENDED });

      await startFailedFetch(page);
      await waitForLanding(page, run);

      // The stage under test: ended, but still in OTel's batch when the page started to unload.
      const timeline = beforeUnload(await attachTimeline(testInfo, page, request, run));
      expect(timeline.at(-1)).toMatchObject({ name: 'pagehide: before SDK', failSpan: 'ended' });
      expect(timeline.filter(({ name, carriesFailSpan }) => name === EXPORTED_TO_FARO && carriesFailSpan)).toEqual([]);
      await expectDelivered(request, run);
    });

    test('span exported into Faro', async ({ page, request }, testInfo) => {
      const run = await openRepro(page, { hold: true, releaseAt: EXPORTED_TO_FARO });

      await startFailedFetch(page);
      await waitForLanding(page, run);

      // The stage under test: in Faro's batch when the page started to unload.
      const timeline = beforeUnload(await attachTimeline(testInfo, page, request, run));
      expect(timeline.at(-1)).toMatchObject({ name: 'pagehide: before SDK' });
      expect(timeline.filter(({ name, carriesFailSpan }) => name === EXPORTED_TO_FARO && carriesFailSpan)).toHaveLength(
        1
      );
      await expectDelivered(request, run);
    });
  });
});
