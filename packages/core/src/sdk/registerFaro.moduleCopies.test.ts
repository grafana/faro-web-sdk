import { mockConfig, MockTransport } from '../testUtils';

it('routes an isolated module copy through its own export when another copy registered globally', () => {
  const globalTransport = new MockTransport();
  const isolatedTransport = new MockTransport();

  jest.isolateModules(() => {
    const globalCopy = require('../index') as typeof import('../index');
    const globalFaro = globalCopy.initializeFaro(mockConfig({ isolate: false, transports: [globalTransport] }));

    expect(globalCopy.faro).toBe(globalFaro);
  });

  jest.isolateModules(() => {
    const isolatedCopy = require('../index') as typeof import('../index');
    const isolatedFaro = isolatedCopy.initializeFaro(mockConfig({ isolate: true, transports: [isolatedTransport] }));

    expect(isolatedCopy.faro).toBe(isolatedFaro);
    isolatedCopy.faro.api.pushLog(['from isolated module copy']);
  });

  expect(globalTransport.items).toHaveLength(0);
  expect(isolatedTransport.items).toHaveLength(1);
});
