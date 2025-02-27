import { initializeFaro } from '@grafana/faro-core';
import { mockConfig, MockTransport } from '@grafana/faro-core/src/testUtils';

import { WebVitalsInstrumentation } from './instrumentation';
import { WebVitalsBasic } from './webVitalsBasic';
import { WebVitalsWithAttribution } from './webVitalsWithAttribution';

jest.mock('./webVitalsWithAttribution');
jest.mock('./webVitalsBasic');

describe('WebVitals Instrumentation', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('load WebVitalsWithAttribution by default', () => {
    const transport = new MockTransport();

    initializeFaro(
      mockConfig({
        transports: [transport],
        instrumentations: [new WebVitalsInstrumentation()],
      })
    );

    expect(WebVitalsBasic).toHaveBeenCalledTimes(0);
    expect(WebVitalsWithAttribution).toHaveBeenCalledTimes(1);
  });

  it('load WebVitalsBasic when trackWebVitalAttribution is false', () => {
    const transport = new MockTransport();

    initializeFaro(
      mockConfig({
        trackWebVitalsAttribution: false,
        transports: [transport],
        instrumentations: [new WebVitalsInstrumentation()],
      })
    );

    expect(WebVitalsBasic).toHaveBeenCalledTimes(1);
    expect(WebVitalsWithAttribution).toHaveBeenCalledTimes(0);
  });

  it('load WebVitalsWithAttribution when webVitalsInstrumentation.trackAttribution is true', () => {
    const transport = new MockTransport();

    initializeFaro(
      mockConfig({
        webVitalsInstrumentation: {
          trackAttribution: true,
        },
        transports: [transport],
        instrumentations: [new WebVitalsInstrumentation()],
      })
    );

    expect(WebVitalsBasic).toHaveBeenCalledTimes(0);
    expect(WebVitalsWithAttribution).toHaveBeenCalledTimes(1);
  });
});
