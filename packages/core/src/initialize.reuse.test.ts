import type { Faro } from './sdk';

describe('initializeFaro reuse', () => {
  afterEach(() => {
    jest.resetModules();
    jest.dontMock('./globalObject');
  });

  it('returns the existing non-isolated Faro instance when initialized again', () => {
    const mockGlobalObject: Record<string, Faro> = {};

    jest.isolateModules(() => {
      jest.doMock('./globalObject', () => ({
        globalObject: mockGlobalObject,
      }));

      const { initializeFaro } = require('./initialize') as typeof import('./initialize');
      const { mockConfig } = require('./testUtils') as typeof import('./testUtils');

      const firstFaro = initializeFaro(
        mockConfig({
          isolate: false,
        })
      );

      const secondFaro = initializeFaro(
        mockConfig({
          isolate: false,
        })
      );

      expect(secondFaro).toBe(firstFaro);
    });
  });
});
