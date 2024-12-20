import { BaseTransport, initializeFaro, VERSION } from '@grafana/faro-core';
import type { Patterns, TransportItem } from '@grafana/faro-core';
import { mockConfig } from '@grafana/faro-core/src/testUtils';

import { getIgnoreUrls } from './url';

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
});
