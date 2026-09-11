import type { History } from 'history';

import { createReactRouterV5Options } from './initialize';

function createOptions(history: History) {
  return createReactRouterV5Options({
    history,
    Route: () => null,
  });
}

describe('createReactRouterV5Options', () => {
  it('accepts a history v4 instance', () => {
    const history = {} as History;

    expect(createOptions(history).dependencies.history).toBe(history);
  });
});
