import { initializeFaro, SessionInstrumentation } from '@grafana/faro-web-sdk';
import type { TransportItem } from '@grafana/faro-web-sdk';
import { TracingInstrumentation } from '@grafana/faro-web-tracing';

/**
 * Reproduction page for issue #2315: the app makes a request, sees an HTTP error, and navigates away.
 *
 * Faro runs with its default transport and batching, and with only the session and tracing
 * instrumentations, so the payload stays small and the only traced request is the failing one.
 *
 * Query parameters:
 * - `run`: id of this run. Faro sends to `/collect/<run>` and the failing request goes to `/__repro/fail/<run>`.
 * - `hold=1`: the server holds the navigation response until it receives a release request.
 * - `releaseAt=<timeline entry>`: with `hold=1`, the page sends that release when it records the entry,
 *   so the page unloads once the span reaches that stage. Playwright cannot evaluate in a page while
 *   its own navigation is pending, so the spec cannot do this itself.
 * - `observe=0`: run without the observers below.
 *
 * The observers only record. They write a timeline to sessionStorage, which survives the navigation,
 * so the spec can tell how far the span got before the page unloaded.
 */

export interface TimelineEntry {
  atMs: number;
  name: string;
  [detail: string]: unknown;
}

type FailSpanState = 'not-started' | 'recording' | 'ended';

declare global {
  interface Window {
    faroNavigationRepro?: { start: () => void };
  }
}

// The subset of an OpenTelemetry span the observers use. The harness does not depend on OTel directly.
interface ObservedSpan {
  end(endTime?: unknown): void;
  isRecording(): boolean;
  spanContext(): { spanId: string };
}

const params = new URLSearchParams(window.location.search);
const run = params.get('run') ?? 'manual';
const hold = params.get('hold') === '1';
const releaseAt = params.get('releaseAt');
const observe = params.get('observe') !== '0';

const failPath = `/__repro/fail/${run}`;
const timelineKey = `faro-navigation-repro:${run}`;

let failSpan: ObservedSpan | undefined;
let releaseSent = false;

function failSpanState(): FailSpanState {
  if (!failSpan) {
    return 'not-started';
  }
  return failSpan.isRecording() ? 'recording' : 'ended';
}

function record(name: string, detail: Record<string, unknown> = {}): void {
  if (!observe) {
    return;
  }
  const timeline = JSON.parse(window.sessionStorage.getItem(timelineKey) ?? '[]') as TimelineEntry[];
  timeline.push({ atMs: performance.timeOrigin + performance.now(), name, failSpan: failSpanState(), ...detail });
  window.sessionStorage.setItem(timelineKey, JSON.stringify(timeline));

  if (hold && name === releaseAt && detail['carriesFailSpan'] !== false && !releaseSent) {
    // OTel does not trace beacons, so this adds nothing to the telemetry under test.
    releaseSent = navigator.sendBeacon(`/__repro/release/${run}`);
    record('page: navigation release sent');
  }
}

/** Whether a value carries the failing span, found by its span id. */
function carriesFailSpan(value: unknown): boolean {
  return failSpan !== undefined && JSON.stringify(value).includes(failSpan.spanContext().spanId);
}

function describeItem(item: TransportItem): string {
  const payload = item.payload as { name?: string };
  const name = item.type === 'event' ? `:${payload.name}` : '';
  return `${item.type}${name}${carriesFailSpan(item.payload) ? ' (fail span)' : ''}`;
}

const tracing = new TracingInstrumentation(
  observe
    ? {
        instrumentationOptions: {
          fetchInstrumentationOptions: {
            requestHook: (span) => {
              const observed = span as unknown as ObservedSpan & { attributes?: Record<string, unknown> };
              if (!Object.values(observed.attributes ?? {}).some((value) => String(value).includes(failPath))) {
                return;
              }
              failSpan = observed;
              const end = observed.end.bind(observed);
              observed.end = (endTime) => {
                end(endTime);
                record('otel: fail span ended');
              };
              record('otel: fail span started');
            },
            // OTel calls this once the response body has been read, then ends the span 300 ms later.
            applyCustomAttributesOnSpan: (span) => {
              if (span === (failSpan as unknown)) {
                record('otel: fail span end scheduled');
              }
            },
          },
        },
      }
    : {}
);

const faro = initializeFaro({
  url: `/collect/${run}`,
  app: { name: 'faro-navigation-repro', version: '0.0.0', environment: 'test' },
  instrumentations: [new SessionInstrumentation(), tracing],
  // Runs when Faro's batch hands items to the transport, not when they are queued.
  ...(observe && {
    beforeSend: (item: TransportItem) => {
      record('faro: batch flushed item to transport', { item: describeItem(item) });
      return item;
    },
  }),
});

if (observe) {
  // The trace exporter calls this when OTel exports a span into Faro's batch.
  const pushTraces = faro.api.pushTraces;
  faro.api.pushTraces = (payload) => {
    record('faro: OTel exported spans into Faro', { carriesFailSpan: carriesFailSpan(payload) });
    pushTraces(payload);
  };

  // Installed after the tracing instrumentation, so this wraps the traced fetch and sees every call
  // the transport makes, including the keepalive flag the browser is given.
  const tracedFetch = window.fetch;
  window.fetch = function (this: unknown, ...args: Parameters<typeof fetch>) {
    const [input, init] = args;
    const url = typeof input === 'string' ? input : input instanceof URL ? input.href : input.url;
    if (url.includes('/collect/')) {
      let body: { traces?: unknown; events?: Array<{ name: string }> } = {};
      try {
        body = JSON.parse(String(init?.body));
      } catch {
        // A compressed body cannot be read here. Record the call without its contents.
      }
      record('transport: fetch issued', {
        keepalive: init?.keepalive === true,
        carriesFailSpan: carriesFailSpan(body.traces ?? null),
        carriesFetchEvent: (body.events ?? []).some((event) => event.name === 'faro.tracing.fetch'),
      });
    }
    return Reflect.apply(tracedFetch, this, args) as ReturnType<typeof fetch>;
  };

  // A capturing listener on the window runs before Faro's and OTel's listeners, and a bubbling one
  // runs after them, so the timeline brackets what the SDK does in each lifecycle event.
  window.addEventListener('pagehide', (event) => record('pagehide: before SDK', { persisted: event.persisted }), true);
  window.addEventListener('pagehide', () => record('pagehide: after SDK'));
  window.addEventListener(
    'visibilitychange',
    () => record(`visibilitychange ${document.visibilityState}: before SDK`),
    true
  );
  window.addEventListener('visibilitychange', () => record(`visibilitychange ${document.visibilityState}: after SDK`));
}

async function failThenNavigate(): Promise<void> {
  record('app: fetch');
  const response = await fetch(failPath);
  record('app: response', { status: response.status });
  if (!response.ok) {
    window.location.assign(`/__repro/landed/${run}${hold ? '?hold=1' : ''}`);
  }
}

window.faroNavigationRepro = {
  start: () => void failThenNavigate(),
};
