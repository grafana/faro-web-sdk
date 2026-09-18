import { context, propagation, trace } from '@opentelemetry/api';
import type { ReadableSpan } from '@opentelemetry/sdk-trace-web';

import { MockTransport } from '@grafana/faro-core/src/testUtils';
import { initializeFaro, SessionInstrumentation } from '@grafana/faro-web-sdk';
import type { Faro } from '@grafana/faro-web-sdk';

import { FaroMetaAttributesSpanProcessor } from './faroMetaAttributesSpanProcessor';
import { TracingInstrumentation } from './instrumentation';
import { ATTR_SESSION_ID } from './semconv';

describe('tracing during prerender activation', () => {
  let prerendering: boolean;
  let faro: Faro;
  let session: SessionInstrumentation;
  let documentListeners: jest.SpyInstance;
  const originalPrerendering = Object.getOwnPropertyDescriptor(document, 'prerendering');

  beforeEach(() => {
    jest.useFakeTimers();
    window.sessionStorage.clear();
    window.localStorage.clear();
    trace.disable();
    context.disable();
    propagation.disable();
    prerendering = true;
    Object.defineProperty(document, 'prerendering', { configurable: true, get: () => prerendering });
    documentListeners = jest.spyOn(document, 'addEventListener');
    session = new SessionInstrumentation();
  });

  afterEach(() => {
    faro?.pause();
    session.destroy();
    for (const [type, listener, options] of documentListeners.mock.calls) {
      document.removeEventListener(type, listener, options);
    }
    trace.disable();
    context.disable();
    propagation.disable();
    if (originalPrerendering) {
      Object.defineProperty(document, 'prerendering', originalPrerendering);
    } else {
      Reflect.deleteProperty(document, 'prerendering');
    }
    jest.restoreAllMocks();
    jest.clearAllTimers();
    jest.useRealTimers();
    window.sessionStorage.clear();
    window.localStorage.clear();
  });

  describe.each([false, true])('persistent=%s', (persistent) => {
    describe.each(['before', 'after'])('application listener registered %s Faro', (listenerOrder) => {
      it.each([0, 1])('uses the activated session to sample spans at samplingRate=%s', (samplingRate) => {
        const endedSpans: ReadableSpan[] = [];
        let activationRecording: boolean | undefined;
        const appListener = () => {
          const span = trace.getTracer('prerender-test').startSpan('activation-span');
          activationRecording = span.isRecording();
          span.end();
        };
        if (listenerOrder === 'before') {
          document.addEventListener('prerenderingchange', appListener);
        }
        faro = initializeFaro({
          app: { name: 'prerender-test' },
          isolate: true,
          preventGlobalExposure: true,
          transports: [new MockTransport()],
          instrumentations: [session],
          sessionTracking: { persistent, samplingRate },
        });
        faro.instrumentations.add(
          new TracingInstrumentation({
            instrumentations: [],
            spanProcessor: new FaroMetaAttributesSpanProcessor(
              {
                onStart: jest.fn(),
                onEnd: (span) => {
                  endedSpans.push(span);
                },
                forceFlush: jest.fn().mockResolvedValue(undefined),
                shutdown: jest.fn().mockResolvedValue(undefined),
              },
              faro.metas
            ),
          })
        );
        if (listenerOrder === 'after') {
          document.addEventListener('prerenderingchange', appListener);
        }

        const tracer = trace.getTracer('prerender-test');
        const speculativeSpan = tracer.startSpan('before-activation');
        expect(speculativeSpan.isRecording()).toBe(false);
        speculativeSpan.end();
        expect(faro.api.getSession()).toBeUndefined();

        // Chromium replaces speculative sessionStorage before dispatching activation.
        window.sessionStorage.clear();
        prerendering = false;
        document.dispatchEvent(new Event('prerenderingchange'));

        const laterSpan = tracer.startSpan('after-activation');
        expect(laterSpan.isRecording()).toBe(samplingRate === 1);
        laterSpan.end();
        expect(activationRecording).toBe(samplingRate === 1);
        if (samplingRate === 1) {
          expect(endedSpans.map((span) => span.name)).toEqual(['activation-span', 'after-activation']);
          const sessionId = faro.api.getSession()?.id;
          expect(sessionId).toEqual(expect.any(String));
          expect(endedSpans.map((span) => span.attributes[ATTR_SESSION_ID])).toEqual([sessionId, sessionId]);
        } else {
          expect(endedSpans).toHaveLength(0);
        }
      });
    });
  });
});
