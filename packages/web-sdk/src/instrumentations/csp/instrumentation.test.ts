import { initializeFaro, TransportItem } from '@grafana/faro-core';
import type { EventEvent } from '@grafana/faro-core';
import { mockConfig, MockTransport } from '@grafana/faro-core/src/testUtils';

import { makeCoreConfig } from '../../config';

import { CSPInstrumentation } from './instrumentation';

describe('CSPInstrumentation', () => {
  afterEach(() => {
    jest.resetAllMocks();
    jest.restoreAllMocks();
  });

  it('sends a faro event when securitypolicyviolation event is fired', () => {
    const mockTransport = new MockTransport();

    const instrumentation = new CSPInstrumentation();
    initializeFaro(
      makeCoreConfig(
        mockConfig({
          transports: [mockTransport],
          instrumentations: [instrumentation],
        })
      )!
    );

    const fakeEvent = {
      blockedURI: 'https://evil.com/script.js',
      documentURI: 'https://my.app/',
      sourceFile: 'https://my.app/index.js',
      statusCode: 200,
      lineNumber: 10,
      columnNumber: 5,
      disposition: 'enforce',
      effectiveDirective: 'script-src',
      violatedDirective: 'script-src-elem',
      originalPolicy: "default-src 'self'; script-src 'self'",
      referrer: 'https://referrer.app/',
      sample: 'alert("xss")',
    } as SecurityPolicyViolationEvent;

    // Note: We can't simulate real `securitypolicyviolation` events in Jest/jsdom,
    // because `SecurityPolicyViolationEvent` is not implemented and CSP is not enforced.
    // Instead, we manually call the handler with a mocked object that matches the shape.
    // This ensures the instrumentation logic is tested even without full browser support.
    instrumentation.securitypolicyviolationHandler(fakeEvent);
    expect(mockTransport.items).toHaveLength(1);

    expect((mockTransport.items[0] as TransportItem<EventEvent>)?.payload.attributes?.['lineNumber']).toBe('10');
  });

  it('ensures listener gets removed on teardown', () => {
    const mockTransport = new MockTransport();
    const removeSpy = jest.spyOn(document, 'removeEventListener');

    const instrumentation = new CSPInstrumentation();
    const faro = initializeFaro(
      makeCoreConfig(
        mockConfig({
          transports: [mockTransport],
          instrumentations: [instrumentation],
        })
      )!
    );
    faro.internalLogger.warn = jest.fn();

    faro.instrumentations.remove(instrumentation);
    expect(removeSpy).toHaveBeenCalledWith('securitypolicyviolation', instrumentation.securitypolicyviolationHandler);
  });
});
