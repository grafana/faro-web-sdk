import { BaseTransport, initializeFaro, VERSION } from '@grafana/faro-core';
import type { Patterns, TransportItem } from '@grafana/faro-core';
import { mockConfig } from '@grafana/faro-core/src/testUtils';

import {
  firstPartyDomainAttribute,
  getDomainLevelAttribute,
  getIgnoreUrls,
  isSameDomain,
  thirdPartyDomainAttribute,
} from './url';

class MockTransport extends BaseTransport {
  readonly name = '@grafana/transport-mock';
  readonly version = VERSION;

  items: TransportItem[] = [];

  constructor(private ignoreURLs: Patterns = []) {
    super();
  }

  send(items: TransportItem[]): void | Promise<void> {
    this.items.push(...items);
  }

  override isBatched(): boolean {
    return true;
  }

  override getIgnoreUrls(): Patterns {
    return (this.ignoreURLs ?? ([] as Patterns[])).concat(this.config.ignoreUrls ?? []);
  }
}
const originalWindow = window;

describe('Urls', () => {
  const mockUrl = 'http://dummy.com';

  beforeEach(() => {
    window = Object.create(window);
    Object.defineProperty(window, 'location', {
      value: {
        href: mockUrl,
        hostname: 'dummy.com',
      },
      writable: true, // possibility to override
    });
  });

  afterEach(() => {
    jest.clearAllMocks();
    jest.restoreAllMocks();
  });

  afterAll(() => {
    window = originalWindow;
  });

  it('should return the correct ignore urls for the given configuration', () => {
    const transport = new MockTransport(['http://foo.com']);

    initializeFaro(
      mockConfig({
        transports: [transport],
        ignoreUrls: ['http://example.com', 'http://example2.com/test'],
      })
    );

    const urls = getIgnoreUrls();

    expect(urls).toEqual(['http://foo.com', 'http://example.com', 'http://example2.com/test']);
  });

  it('should correctly determine if a URL is on the same domain', () => {
    expect(isSameDomain(new URL('http://dummy.com'))).toBe(true);
    expect(isSameDomain(new URL('http://other-domain.com'))).toBe(false);
  });

  it('should return the correct attribute based on whether the URL is on the same domain', () => {
    expect(getDomainLevelAttribute(new URL('http://dummy.com'))).toBe(firstPartyDomainAttribute);
    expect(getDomainLevelAttribute(new URL('http://other-domain.com'))).toBe(thirdPartyDomainAttribute);
  });
});
