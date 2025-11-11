import { initializeFaro } from '@grafana/faro-core';
import { mockConfig, MockTransport } from '@grafana/faro-core/src/testUtils';

import { WebVitalsInstrumentation } from './instrumentation';
import { WebVitalsWithAttribution } from './webVitalsWithAttribution';

jest.mock('./webVitalsWithAttribution');

describe('WebVitals Instrumentation', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('loads WebVitalsWithAttribution', () => {
    const transport = new MockTransport();

    initializeFaro(
      mockConfig({
        transports: [transport],
        instrumentations: [new WebVitalsInstrumentation()],
      })
    );

    expect(WebVitalsWithAttribution).toHaveBeenCalledTimes(1);
  });
});
