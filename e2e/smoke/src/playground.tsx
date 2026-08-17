/**
 * Exercises the API a customer actually calls, on the path a customer using a bundler actually takes.
 *
 * Every check is one thing somebody does with Faro. A person can open this page and read the table; a
 * Playwright spec opens the same page and asserts that nothing failed.
 */
import { createElement, type ReactNode, useState } from 'react';
import { createRoot } from 'react-dom/client';

import {
  FaroErrorBoundary,
  faro as faroGlobal,
  getWebInstrumentations,
  initializeFaro,
  LogLevel,
  ReactIntegration,
  VERSION,
  withFaroErrorBoundary,
  withFaroProfiler,
} from '@grafana/faro-react';
import { OtlpHttpTransport } from '@grafana/faro-transport-otlp-http';
import { TracingInstrumentation } from '@grafana/faro-web-tracing';

import { assert, type Check, runChecks, waitFor } from './checks';

/**
 * Record what leaves the page, by wrapping fetch before Faro initializes.
 *
 * Ordering matters and is easy to get wrong. The tracing instrumentation patches `window.fetch` during
 * `initializeFaro`, so it wraps *this* function. A call therefore runs the instrumentation first and
 * this recorder second, which is exactly what we want: by the time the recorder sees a request, the
 * instrumentation has already added its `traceparent`. Wrapping again after initialization would sit
 * on the wrong side of the patch and never see that header.
 */
const sent: Array<Record<string, unknown>> = [];
const requests: Array<{ url: string; traceparent: string | null }> = [];
const nativeFetch = window.fetch.bind(window);

window.fetch = async (input, init) => {
  const url = typeof input === 'string' ? input : input instanceof URL ? input.href : input.url;
  const headers = new Headers(init?.headers ?? (input instanceof Request ? input.headers : undefined));
  requests.push({ url, traceparent: headers.get('traceparent') });

  if (url.includes('/collect') && init?.body) {
    try {
      sent.push(JSON.parse(String(init.body)));
    } catch {
      // A body we cannot parse is not interesting here.
    }
  }

  return nativeFetch(input as RequestInfo, init);
};

const countOf = (predicate: (body: Record<string, unknown>) => boolean) => sent.filter(predicate).length;

const hasLog = (message: string) => (body: Record<string, unknown>) =>
  JSON.stringify(body['logs'] ?? []).includes(message);
const hasEvent = (name: string) => (body: Record<string, unknown>) =>
  JSON.stringify(body['events'] ?? []).includes(name);

const faro = initializeFaro({
  url: '/collect',
  app: { name: 'faro-playground', version: '0.0.0', environment: 'test' },
  instrumentations: [...getWebInstrumentations(), new ReactIntegration(), new TracingInstrumentation()],
});

const checks: Check[] = [
  {
    name: 'initializeFaro returns a usable instance',
    run: () => {
      assert(typeof faro.api === 'object', 'faro.api is missing');
      assert(typeof faro.metas === 'object', 'faro.metas is missing');
      assert(typeof faro.transports === 'object', 'faro.transports is missing');
      assert(typeof faro.pause === 'function' && typeof faro.unpause === 'function', 'pause/unpause missing');
      assert(faroGlobal === faro, 'the exported faro singleton is not the initialized instance');
    },
  },
  {
    name: 'VERSION is a real version string',
    run: () => assert(typeof VERSION === 'string' && VERSION.length > 0, `VERSION was ${JSON.stringify(VERSION)}`),
  },
  {
    name: 'getWebInstrumentations plus react and tracing all register',
    run: () => {
      const names = faro.instrumentations.instrumentations.map((instrumentation) => instrumentation.name);
      for (const expected of [
        '@grafana/faro-web-sdk:instrumentation-errors',
        '@grafana/faro-web-sdk:instrumentation-web-vitals',
        '@grafana/faro-web-sdk:instrumentation-session',
        '@grafana/faro-web-sdk:instrumentation-view',
        '@grafana/faro-web-sdk:instrumentation-console',
        '@grafana/faro-react',
        '@grafana/faro-web-tracing',
      ]) {
        assert(names.includes(expected), `${expected} did not register. Registered: ${names.join(', ')}`);
      }
    },
  },
  {
    name: 'pushLog reaches the collector',
    run: async () => {
      faro.api.pushLog(['playground log'], { level: LogLevel.INFO });
      await waitFor(() => countOf(hasLog('playground log')) > 0, 'a log payload');
    },
  },
  {
    name: 'pushEvent reaches the collector',
    run: async () => {
      faro.api.pushEvent('playground-event', { source: 'playground' });
      await waitFor(() => countOf(hasEvent('playground-event')) > 0, 'an event payload');
    },
  },
  {
    name: 'pushError reaches the collector',
    run: async () => {
      faro.api.pushError(new Error('playground error'));
      await waitFor(
        () => countOf((body) => JSON.stringify(body['exceptions'] ?? []).includes('playground error')) > 0,
        'an exception payload'
      );
    },
  },
  {
    name: 'pushMeasurement reaches the collector',
    run: async () => {
      faro.api.pushMeasurement({ type: 'playground-measurement', values: { duration: 42 } });
      await waitFor(
        () => countOf((body) => JSON.stringify(body['measurements'] ?? []).includes('playground-measurement')) > 0,
        'a measurement payload'
      );
    },
  },
  {
    name: 'getOTEL returns a working tracer and the span is exported',
    run: async () => {
      const otel = faro.api.getOTEL();
      assert(otel, 'faro.api.getOTEL() returned nothing, so tracing did not initialize');
      const span = otel.trace.getTracer('playground').startSpan('playground-span');
      span.end();
      await waitFor(
        () => countOf((body) => JSON.stringify(body['traces'] ?? {}).includes('playground-span')) > 0,
        'a trace payload'
      );
    },
  },
  {
    name: 'a traced fetch carries a traceparent header',
    run: async () => {
      await fetch('/api/ping').catch(() => undefined);
      await waitFor(
        () => requests.some((request) => request.url.includes('/api/ping') && request.traceparent !== null),
        'a traceparent header on the outgoing request'
      );
    },
  },
  {
    name: 'startUserAction opens an action that is then the active one',
    run: () => {
      const action = faro.api.startUserAction('playground-action');
      assert(action, 'startUserAction returned nothing');
      const active = faro.api.getActiveUserAction();
      assert(active, 'getActiveUserAction returned nothing while an action was open');
      assert(active.name === 'playground-action', `active action was ${active.name}`);
    },
  },
  {
    name: 'meta round-trips user, view and session',
    run: () => {
      faro.api.setUser({ id: 'playground-user' });
      faro.api.setView({ name: 'playground-view' });
      assert(faro.metas.value.user?.id === 'playground-user', 'setUser did not reach the metas');
      assert(faro.api.getView()?.name === 'playground-view', 'setView did not reach the metas');
      assert(typeof faro.api.getSession()?.id === 'string', 'no session identifier is present');
    },
  },
  {
    name: 'pause stops sending and unpause resumes it',
    run: async () => {
      const before = sent.length;
      faro.pause();
      faro.api.pushLog(['log while paused']);
      await new Promise((resolve) => setTimeout(resolve, 300));
      assert(countOf(hasLog('log while paused')) === 0, 'a payload was sent while paused');

      faro.unpause();
      faro.api.pushLog(['log after unpause']);
      await waitFor(() => countOf(hasLog('log after unpause')) > 0, 'a payload after unpause');
      assert(sent.length > before, 'nothing was sent after unpause');
    },
  },
  {
    name: 'FaroErrorBoundary catches a render error and reports it',
    run: async () => {
      const host = document.createElement('div');
      document.body.appendChild(host);

      function Boom(): ReactNode {
        throw new Error('playground boundary error');
      }

      createRoot(host).render(
        createElement(FaroErrorBoundary, { fallback: createElement('span', null, 'caught') }, createElement(Boom))
      );

      await waitFor(() => host.textContent === 'caught', 'the error boundary fallback to render');
      await waitFor(
        () => countOf((body) => JSON.stringify(body['exceptions'] ?? []).includes('playground boundary error')) > 0,
        'the boundary error to be reported'
      );
    },
  },
  {
    name: 'withFaroErrorBoundary and withFaroProfiler wrap a component',
    run: async () => {
      const Plain = () => createElement('span', null, 'wrapped');
      const Wrapped = withFaroErrorBoundary(Plain, {});
      const Profiled = withFaroProfiler(Plain);

      const host = document.createElement('div');
      document.body.appendChild(host);
      createRoot(host).render(createElement('div', null, createElement(Wrapped), createElement(Profiled)));

      await waitFor(() => host.textContent === 'wrappedwrapped', 'both wrapped components to render');
    },
  },
  {
    name: 'the experimental OTLP transport constructs',
    run: () => {
      const transport = new OtlpHttpTransport({ tracesURL: '/otlp/v1/traces' });
      assert(typeof transport.send === 'function', 'the transport has no send method');
      assert(typeof transport.name === 'string' && transport.name.length > 0, 'the transport has no name');
    },
  },
];

function Page() {
  const [container, setContainer] = useState<HTMLDivElement | null>(null);
  const [started, setStarted] = useState(false);

  if (container && !started) {
    setStarted(true);
    void runChecks(checks, container);
  }

  return (
    <main>
      <h1>Faro Web SDK playground</h1>
      <p>
        Every check below is something a customer does, run against the packages as a bundler resolves them. Open the
        terminal running Vite to watch the payloads arrive.
      </p>
      <div ref={setContainer} />
    </main>
  );
}

const root = document.getElementById('root');
if (root) {
  createRoot(root).render(createElement(Page));
}
