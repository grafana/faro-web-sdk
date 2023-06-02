import { globalObject, initializeFaro } from '@grafana/faro-core';
import { mockConfig } from '@grafana/faro-core/src/testUtils';

import { FetchInstrumentation } from './instrumentation';

const mockObserve = jest.fn();

describe('FetchInstrumentation', () => {
  beforeEach(() => {
    mockObserve.mockClear();
  });

  it('initialize FetchInstrumentation with default options', () => {
    const instrumentation = new FetchInstrumentation();

    expect(instrumentation.name).toBe('@grafana/faro-web-sdk:instrumentation-fetch');
  });

  it('initialize FetchInstrumentation with provided options', () => {
    const instrumentation = new FetchInstrumentation({
      ignoredUrls: ['https://example.com'],
    });
    instrumentation.initialize()

    expect(instrumentation.getIgnoredUrls()).toEqual(['https://example.com']);
  });

  it('initializes FetchInstrumentation and saves original fetch to window.originalFetch', () => {
    const instrumentation = new FetchInstrumentation();
    const config = mockConfig({ dedupe: true, instrumentations: [instrumentation] });
    initializeFaro(config);

    expect(globalObject.hasOwnProperty('originalFetch')).toBe(true);
  });

  it('initializes FetchInstrumentation and calls fetch', () => {
    const instrumentation = new FetchInstrumentation();
    const config = mockConfig({ dedupe: true, instrumentations: [instrumentation] });
    initializeFaro(config);

    const mockFetch = jest.fn();
    Object.defineProperty(globalObject, 'fetch', {
      configurable: true,
      enumerable: false,
      writable: false,
      value: mockFetch,
    });

    fetch('https://example.com');

    expect(mockFetch).toBeCalledTimes(1);
  });

  it('initializes FetchInstrumentation and calls fetch with ignored URL', () => {
    const instrumentation = new FetchInstrumentation({
      ignoredUrls: ['https://example.com'],
    });
    const config = mockConfig({ dedupe: true, instrumentations: [instrumentation] });
    initializeFaro(config);

    const mockOriginalFetch = jest.fn();
    Object.defineProperty(globalObject, 'originalFetch', {
      configurable: true,
      enumerable: false,
      writable: false,
      value: mockOriginalFetch,
    });

    fetch('https://example.com');

    expect(mockOriginalFetch).toBeCalledTimes(1);
  });
});
