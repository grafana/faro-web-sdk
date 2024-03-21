import { mockConfig, MockTransport } from '@grafana/faro-core/src/testUtils';

import { initializeFaro } from '../../initialize';

import { registerOnerror } from './registerOnerror';
import { cachedBundleIdStackFrameMap, ExceptionEvent } from '@grafana/faro-core';

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

  it('will append bundleid to stackframes', () => {
    window.onerror = () => {};

    const error = new Error('boo');
    (global as any).__faroBundleId_foo = 'bar';
    (global as any).__faroBundleIds = new Map([[error, 'bar']]);

    const transport = new MockTransport();
    const { api } = initializeFaro(
      mockConfig({
        transports: [transport],
      })
    );

    registerOnerror(api);

    window.onerror('boo', 'some file', 10, 10, error);
    expect(transport.items).toHaveLength(1);
    expect(cachedBundleIdStackFrameMap.keys().next().value).toEqual('bar');
    const hasBundleId = (transport.items[0]?.payload as ExceptionEvent).stacktrace?.frames.every(
      (frame) => frame.bundleid === 'bar'
    );
    expect(hasBundleId).toBe(true);
  });
});
