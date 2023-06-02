import { enableFetchMocks } from 'jest-fetch-mock';
enableFetchMocks()

import { globalObject, initializeFaro } from '@grafana/faro-core';
import { mockConfig } from '@grafana/faro-core/src/testUtils';

import { FetchInstrumentation } from './instrumentation';

const testUrl = 'http://localhost:8080/test';
const spyFetchMock = jest.spyOn(globalObject, 'fetch');

describe('FetchInstrumentation', () => {
  beforeEach(() => {
    spyFetchMock.mockClear();
  });

  it('initialize FetchInstrumentation with default options', () => {
    const instrumentation = new FetchInstrumentation();

    expect(instrumentation.name).toBe('@grafana/faro-web-sdk:instrumentation-fetch');
  });

  it('initialize FetchInstrumentation with provided options', () => {
    const instrumentation = new FetchInstrumentation({
      ignoredUrls: ['https://example.com'],
    });
    instrumentation.initialize();

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

    globalObject.fetch(testUrl);

    expect(spyFetchMock).toBeCalledTimes(1);
  });
});
