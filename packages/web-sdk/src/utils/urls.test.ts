import { BaseTransport, initializeFaro, VERSION } from '@grafana/faro-core';
import type { Patterns, TransportItem } from '@grafana/faro-core';
import { mockConfig } from '@grafana/faro-core/src/testUtils';

import { getIgnoreUrls, getUrlFromResource, isUrlIgnored } from './url';

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

describe('Urls', () => {
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

  it('isUrlIgnored should return boolean if the url is ignored or not', () => {
    const transport = new MockTransport(['http://foo.com']);

    initializeFaro(
      mockConfig({
        transports: [transport],
        ignoreUrls: ['http://example.com', 'http://example2.com/test', /.*example3.*/],
      })
    );

    expect(isUrlIgnored('http://foo.com')).toBe(true);
    expect(isUrlIgnored('http://example.com')).toBe(true);
    expect(isUrlIgnored('http://example2.com/test')).toBe(true);
    expect(isUrlIgnored('http://example2.com')).toBe(false);
    expect(isUrlIgnored('http://example3.com/abc')).toBe(true);
    expect(isUrlIgnored('')).toBe(false);
    expect(isUrlIgnored(undefined)).toBe(false);
  });

  it('should return the correct url from the resource', () => {
    const resourceString = 'http://example.com';
    const resourceUrl = new URL('http://example.com');
    const resourceObject = {
      toString: () => 'http://example.com',
    };

    expect(getUrlFromResource(resourceString)).toBe(resourceString);
    expect(getUrlFromResource(resourceUrl)).toBe(resourceUrl.href);
    expect(getUrlFromResource(resourceObject)).toBe(resourceObject.toString());
    expect(getUrlFromResource({})).toBeUndefined();
    expect(getUrlFromResource(undefined)).toBeUndefined();
  });
});
