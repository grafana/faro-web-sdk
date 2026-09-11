import { initializeFaro } from '../initialize';
import { mockConfig } from '../testUtils';

import { BaseTransport } from './base';

class LifecycleTransport extends BaseTransport {
  readonly name = 'lifecycle';
  readonly version = '1';
  initialize = jest.fn();
  destroy = jest.fn();
  send = jest.fn();
}

it('initializes a configured transport and disposes it before removal completes', () => {
  const transport = new LifecycleTransport();
  const sdk = initializeFaro(mockConfig());
  transport.initialize.mockImplementation(() => {
    expect(transport.metas).toBe(sdk.metas);
    expect(transport.config).toBe(sdk.config);
  });
  sdk.transports.add(transport);
  expect(transport.initialize).toHaveBeenCalledTimes(1);
  sdk.transports.remove(transport);
  expect(transport.destroy).toHaveBeenCalledTimes(1);
  sdk.transports.add(transport);
  expect(transport.initialize).toHaveBeenCalledTimes(2);
});

it('unwinds a failed transport initialization and permits a retry', () => {
  const transport = new LifecycleTransport();
  const sdk = initializeFaro(mockConfig());
  transport.initialize.mockImplementationOnce(() => {
    throw new Error('initialization failed');
  });
  expect(() => sdk.transports.add(transport)).toThrow('initialization failed');
  expect(transport.destroy).toHaveBeenCalledTimes(1);
  expect(sdk.transports.transports).toHaveLength(0);
  sdk.transports.add(transport);
  expect(sdk.transports.transports).toEqual([transport]);
});

it('preserves a transport re-registered during another selected transport cleanup', () => {
  const first = new LifecycleTransport();
  const second = new LifecycleTransport();
  const sdk = initializeFaro(mockConfig({ transports: [first, second] }));
  first.destroy.mockImplementation(() => {
    sdk.transports.remove(second);
    sdk.transports.add(second);
  });
  sdk.transports.remove(first, second);
  expect(sdk.transports.transports).toEqual([second]);
  expect(second.initialize).toHaveBeenCalledTimes(2);
  expect(second.destroy).toHaveBeenCalledTimes(1);
});

it('does not dispose a newer registration when an older initialization fails', () => {
  const transport = new LifecycleTransport();
  const sdk = initializeFaro(mockConfig());
  transport.initialize.mockImplementationOnce(() => {
    sdk.transports.remove(transport);
    sdk.transports.add(transport);
    throw new Error('obsolete initialization');
  });
  expect(() => sdk.transports.add(transport)).toThrow('obsolete initialization');
  expect(sdk.transports.transports).toEqual([transport]);
  expect(transport.destroy).toHaveBeenCalledTimes(1);
});
