import { XHRInstrumentation } from './instrumentation';

describe('XHRInstrumentation', () => {
  it('initialize XHRInstrumentation with default options', () => {
    const instrumentation = new XHRInstrumentation({
      testing: true,
    });

    expect(instrumentation.name).toBe('@grafana/faro-web-sdk:instrumentation-xhr');
  });

  it('initialize XHRInstrumentation with provided options', () => {
    const instrumentation = new XHRInstrumentation({
      testing: true,
      ignoredUrls: ['https://example.com'],
    });
    instrumentation.initialize();

    expect(instrumentation.getIgnoredUrls()).toEqual(['https://example.com']);
  });
});
