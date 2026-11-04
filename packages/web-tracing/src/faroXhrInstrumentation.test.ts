import { TracerProvider } from '@opentelemetry/sdk-trace';
import type { Span, SpanProcessor } from '@opentelemetry/sdk-trace';

import { mockConfig } from '@grafana/faro-core/src/testUtils';
import { initializeFaro } from '@grafana/faro-web-sdk';

import { FaroXhrInstrumentation } from './faroXhrInstrumentation';

// Runs against the real XMLHttpRequestInstrumentation, because FaroXhrInstrumentation relies on its
// protected _patchOpen and private _createSpan.
describe('FaroXhrInstrumentation', () => {
  let instrumentation: FaroXhrInstrumentation;
  let startedSpans: Span[];

  beforeEach(() => {
    startedSpans = [];

    const spanProcessor: SpanProcessor = {
      onStart: (span) => startedSpans.push(span),
      onEnd: () => {},
      forceFlush: () => Promise.resolve(),
      shutdown: () => Promise.resolve(),
    };

    instrumentation = new FaroXhrInstrumentation();
    instrumentation.setTracerProvider(new TracerProvider({ spanProcessors: [spanProcessor] }));
  });

  afterEach(() => {
    instrumentation.disable();
  });

  it('creates a span for a URL object and adds the active user action', () => {
    const faro = initializeFaro(mockConfig());
    const userAction = faro.api.startUserAction('test-action');

    new XMLHttpRequest().open('GET', new URL('http://example.com/api'));

    expect(startedSpans).toHaveLength(1);
    expect(startedSpans[0]!.attributes).toMatchObject({
      'url.full': 'http://example.com/api',
      'faro.action.user.name': 'test-action',
      'faro.action.user.parentId': userAction?.parentId,
    });
  });

  it('does not add user action attributes without an active user action', () => {
    initializeFaro(mockConfig());

    new XMLHttpRequest().open('GET', 'http://example.com/api');

    expect(startedSpans).toHaveLength(1);
    expect(startedSpans[0]!.attributes).not.toHaveProperty('faro.action.user.name');
  });

  it('does not create spans after it is disabled', () => {
    initializeFaro(mockConfig());
    instrumentation.disable();

    new XMLHttpRequest().open('GET', 'http://example.com/api');

    expect(startedSpans).toHaveLength(0);
  });
});
