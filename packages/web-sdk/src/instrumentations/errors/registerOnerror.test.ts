import { mockConfig, MockTransport } from '@grafana/faro-core/src/testUtils';

import { initializeFaro } from '../../initialize';

import { registerOnerror } from './registerOnerror';

describe('registerOnerror', () => {
  it('will preserve the old callback', () => {
    let called = false;

    window.onerror = () => {
      called = true;
    };

    const transport = new MockTransport();
    const { api } = initializeFaro(
      mockConfig({
        transports: [transport],
      })
    );

    registerOnerror(api);

    window.onerror('boo', 'some file', 10, 10, new Error('boo'));
    expect(called).toBe(true);
    expect(transport.items).toHaveLength(1);
  });
});
