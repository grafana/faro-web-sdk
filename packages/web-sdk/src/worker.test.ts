/** @jest-environment node */

import { EVENT_SESSION_START } from '@grafana/faro-core';
import type { EventEvent, ExceptionEvent, ExceptionEventExtended, Faro } from '@grafana/faro-core';
import { MockTransport } from '@grafana/faro-core/src/testUtils';

import { getWebInstrumentations, initializeFaro } from './index';
import { __resetConsoleMonitorForTests } from './instrumentations/_internal/monitors/consoleMonitor';
import { isWorker } from './utils/worker';

const instances: Faro[] = [];
let target: EventTarget;

function initialize(options: Partial<Parameters<typeof initializeFaro>[0]> = {}) {
  const transport = new MockTransport();
  const faro = initializeFaro({
    app: { name: 'worker-test' },
    transports: [transport],
    batching: { enabled: false },
    isolate: true,
    ...options,
  });
  instances.push(faro);
  return { faro, transport };
}

beforeEach(() => {
  target = new EventTarget();
  Object.defineProperties(globalThis, {
    self: { configurable: true, value: { [Symbol.toStringTag]: 'SharedWorkerGlobalScope' } },
    addEventListener: { configurable: true, value: target.addEventListener.bind(target) },
    removeEventListener: { configurable: true, value: target.removeEventListener.bind(target) },
  });
});

afterEach(() => {
  for (const faro of instances.splice(0)) {
    // Remove individually: this also verifies each instrumentation's cleanup.
    for (const instrumentation of faro.instrumentations.instrumentations) {
      faro.instrumentations.remove(instrumentation);
    }
  }
  __resetConsoleMonitorForTests();
  Reflect.deleteProperty(globalThis, 'self');
  Reflect.deleteProperty(globalThis, 'addEventListener');
  Reflect.deleteProperty(globalThis, 'removeEventListener');
  jest.restoreAllMocks();
});

it.each(['DedicatedWorkerGlobalScope', 'SharedWorkerGlobalScope', 'ServiceWorkerGlobalScope'])(
  'initializes and delivers signals without browser globals in %s',
  (scope) => {
    Object.defineProperty(self, Symbol.toStringTag, { value: scope });
    expect(typeof window).toBe('undefined');
    expect(typeof document).toBe('undefined');
    expect(typeof XMLHttpRequest).toBe('undefined');
    const { faro, transport } = initialize();

    expect(faro.instrumentations.instrumentations.map(({ name }) => name)).toEqual([
      '@grafana/faro-web-sdk:instrumentation-session',
      '@grafana/faro-web-sdk:instrumentation-errors',
      '@grafana/faro-web-sdk:instrumentation-console',
    ]);
    expect(faro.api.getSession()?.attributes?.['isSampled']).toBe('true');
    expect(faro.metas.value.page).toBeUndefined();
    expect(faro.metas.value.browser?.viewportWidth).toBeUndefined();
    faro.api.pushEvent('worker-event');
    faro.api.pushMeasurement({ type: 'worker', values: { messages: 1 } });
    console.info('worker-log');
    expect(transport.items.map(({ type }) => type)).toEqual(['event', 'event', 'measurement', 'log']);
    expect(transport.items.every(({ meta }) => meta.session?.id === faro.api.getSession()?.id)).toBe(true);
  }
);

it('does not mistake a non-browser runtime for a worker', () => {
  Reflect.deleteProperty(globalThis, 'self');
  expect(isWorker()).toBe(false);
});

it('respects explicit metadata and console opt-out', () => {
  const { faro } = initialize({
    metas: [{ user: { id: 'caller' } }],
    instrumentations: getWebInstrumentations({ captureConsole: false }),
  });
  expect(faro.metas.value.user?.id).toBe('caller');
  expect(faro.metas.value.browser).toBeUndefined();
  expect(faro.instrumentations.instrumentations).toHaveLength(2);
});

it('preserves error stacks and original errors, filters errors, and removes only its own listeners', () => {
  let capturedOriginalError: unknown;
  const first = initialize({
    preserveOriginalError: true,
    ignoreErrors: ['ignored'],
    beforeSend: (item) => {
      if (item.type === 'exception') {
        capturedOriginalError = (item.payload as ExceptionEventExtended).originalError;
      }
      return item;
    },
  });
  const second = initialize();
  const hostHandler = jest.fn();
  target.addEventListener('error', hostHandler);
  const error = new Error('worker error');
  error.stack =
    'Error: worker error\n    at inner (http://localhost/worker.js:10:2)\n    at outer (http://localhost/worker.js:20:4)';
  const dispatch = (error: Error) =>
    target.dispatchEvent(
      Object.assign(new Event('error'), {
        message: error.message,
        error,
        filename: 'http://localhost/worker.js',
        lineno: 10,
        colno: 2,
      })
    );
  dispatch(error);
  expect(capturedOriginalError).toBe(error);
  const exceptions = () => first.transport.items.filter(({ type }) => type === 'exception');
  expect(exceptions()).toHaveLength(1);
  expect(exceptions()[0]?.payload).toMatchObject({
    value: 'worker error',
    stacktrace: {
      frames: expect.arrayContaining([
        expect.objectContaining({ function: 'inner', lineno: 10 }),
        expect.objectContaining({ function: 'outer', lineno: 20 }),
      ]),
    },
  });
  dispatch(new Error('ignored'));
  expect(exceptions()).toHaveLength(1);
  const instrumentation = first.faro.instrumentations.instrumentations.find(({ name }) =>
    name.endsWith(':instrumentation-errors')
  )!;
  first.faro.instrumentations.remove(instrumentation);
  dispatch(new Error('after cleanup'));
  expect(exceptions()).toHaveLength(1);
  expect(second.transport.items.filter(({ type }) => type === 'exception')).toHaveLength(3);
  expect(hostHandler).toHaveBeenCalledTimes(3);
  first.faro.instrumentations.add(instrumentation);
  dispatch(new Error('after reinitialize'));
  expect(exceptions()).toHaveLength(2);
});

it.each([undefined, 'missing'])('uses event coordinates for worker errors without a stack (%p)', (error) => {
  const { transport } = initialize();
  target.dispatchEvent(
    Object.assign(new Event('error'), {
      message: 'ReferenceError: missing',
      error,
      filename: 'worker.js',
      lineno: 12,
      colno: 4,
    })
  );
  expect(transport.items.find(({ type }) => type === 'exception')?.payload).toMatchObject({
    stacktrace: { frames: [expect.objectContaining({ filename: 'worker.js', lineno: 12, colno: 4 })] },
  });
});

it.each([0, false, '', null, undefined, new Error('rejected')])('captures rejection reason %p', (reason) => {
  const { faro, transport } = initialize();
  const event = Object.assign(new Event('unhandledrejection'), { reason });
  target.dispatchEvent(event);
  const errors = transport.items.filter(({ type }) => type === 'exception');
  expect(errors).toHaveLength(1);
  expect((errors[0]?.payload as ExceptionEvent).value).toContain(
    reason instanceof Error ? reason.message : String(reason)
  );
  const instrumentation = faro.instrumentations.instrumentations.find(({ name }) =>
    name.endsWith(':instrumentation-errors')
  )!;
  faro.instrumentations.remove(instrumentation);
  target.dispatchEvent(event);
  expect(transport.items.filter(({ type }) => type === 'exception')).toHaveLength(1);
});

it('keeps sampling and generated identities local to each isolated instance', () => {
  const unsampled = initialize({ sessionTracking: { samplingRate: 0, generateSessionId: () => 'unsampled' } });
  const sampler = jest.fn(() => 1);
  const sampled = initialize({ sessionTracking: { sampler, generateSessionId: () => 'sampled' } });
  unsampled.faro.api.pushEvent('dropped');
  sampled.faro.api.pushEvent('sent');
  expect(unsampled.transport.items).toHaveLength(0);
  expect(sampled.transport.items).toHaveLength(2);
  expect(sampled.faro.api.getSession()?.id).toBe('sampled');
  expect(unsampled.faro.api.getSession()?.id).toBe('unsampled');
  expect(sampler).toHaveBeenCalledTimes(1);
  // Updating user metadata does not rotate or resample a worker session.
  sampled.faro.api.setUser({ id: 'user' });
  expect(sampler).toHaveBeenCalledTimes(1);
});

it('preserves a caller session and sampling across same-id updates and notifies once on replacement', () => {
  const onSessionChange = jest.fn();
  const { faro, transport } = initialize({
    sessionTracking: {
      session: {
        id: 'worker-1',
        attributes: { isSampled: 'true', worker_name: 'test' },
        overrides: { serviceName: 'worker' },
      },
      onSessionChange,
    },
  });
  expect(faro.api.getSession()?.overrides?.serviceName).toBe('worker');
  faro.api.setSession({ id: 'worker-1', attributes: { updated: 'true' } });
  expect(faro.api.getSession()?.attributes).toEqual({ isSampled: 'true', updated: 'true' });
  expect(onSessionChange).not.toHaveBeenCalled();
  faro.api.setSession({ id: 'worker-2' });
  expect(onSessionChange).toHaveBeenCalledTimes(1);
  expect(faro.api.getSession()?.attributes?.['isSampled']).toBe('true');
  faro.api.resetSession();
  expect(faro.api.getSession()?.id).toBeTruthy();
  expect(faro.api.getSession()?.id).not.toBe('worker-2');
  expect(onSessionChange).toHaveBeenCalledTimes(2);
  expect(transport.items.filter(({ payload }) => (payload as EventEvent).name === EVENT_SESSION_START)).toHaveLength(3);
});

it('does not create sessions or lifecycle events when tracking is disabled', () => {
  const { faro, transport } = initialize({ sessionTracking: { enabled: false } });
  expect(faro.api.getSession()).toBeUndefined();
  expect(transport.items).toHaveLength(0);
  faro.api.setSession({ id: 'manual', attributes: { isSampled: 'true' } });
  expect(transport.items).toHaveLength(0);
  faro.api.pushEvent('manual-event');
  expect(transport.items).toHaveLength(1);
});

it('removes worker session hooks on teardown', () => {
  const onSessionChange = jest.fn();
  const { faro, transport } = initialize({ sessionTracking: { onSessionChange } });
  const session = faro.instrumentations.instrumentations.find(({ name }) => name.endsWith(':instrumentation-session'))!;
  const hookCount = faro.transports.getBeforeSendHooks().length;
  faro.instrumentations.remove(session);
  expect(faro.transports.getBeforeSendHooks()).toHaveLength(hookCount - 1);
  faro.api.setSession({ id: 'after-removal' });
  expect(onSessionChange).not.toHaveBeenCalled();
  expect(transport.items).toHaveLength(1);
});
