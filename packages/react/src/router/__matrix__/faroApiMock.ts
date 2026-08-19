// Imported explicitly so this works under both CommonJS (v5/v6/v7) and ESM (v8)
// jest projects — ESM mode does not inject the `jest` global.
import { jest } from '@jest/globals';

import { setDependencies } from '../../dependencies';

export interface RouteChangeCall {
  name: string;
  attributes: Record<string, string> | undefined;
}

export interface FaroApiMock {
  pushEvent: jest.Mock;
  /** All pushEvent calls, normalized to { name, attributes }. */
  events: () => RouteChangeCall[];
  /** pushEvent calls for the `route_change` event only. */
  routeChanges: () => RouteChangeCall[];
}

/**
 * Wires a mock Faro `api` into the react package's dependency holder and returns
 * helpers to inspect the emitted events. Call inside `beforeEach`.
 */
export function installFaroApiMock(): FaroApiMock {
  const pushEvent = jest.fn();

  const apiMock = { pushEvent } as any;
  const internalLoggerMock = { error: jest.fn(), warn: jest.fn(), info: jest.fn(), debug: jest.fn() } as any;

  setDependencies(internalLoggerMock, apiMock);

  const events = (): RouteChangeCall[] => pushEvent.mock.calls.map(([name, attributes]) => ({ name, attributes }));

  return {
    pushEvent,
    events,
    routeChanges: () => events().filter((call) => call.name === 'route_change'),
  };
}
