import type { API } from '../api';
import type { Metas } from '../metas';
import { mockConfig } from '../testUtils/mockConfig';
import { mockInternalLogger } from '../testUtils/mockInternalLogger';
import type { Transports } from '../transports';

import { BaseInstrumentation } from './base';
import { initializeInstrumentations } from './initialize';

class MockInstrumentation extends BaseInstrumentation {
  readonly version = '1.0.0';

  initialize = jest.fn();
  destroy = jest.fn();

  constructor(readonly name: string) {
    super();
  }
}

function createInstrumentations() {
  return initializeInstrumentations(
    console,
    mockInternalLogger,
    mockConfig(),
    {} as Metas,
    {} as Transports,
    {} as API
  );
}

function createMockInstrumentations() {
  return ['A', 'B', 'C'].map((name) => new MockInstrumentation(name));
}

describe('instrumentations', () => {
  describe('remove', () => {
    it.each([
      [0, ['B', 'C']],
      [1, ['A', 'C']],
      [2, ['A', 'B']],
    ])('removes an instrumentation at index %i', (index, expectedNames) => {
      const mockInstrumentations = createMockInstrumentations();
      const instrumentations = createInstrumentations();
      const instrumentationToRemove = mockInstrumentations[index]!;

      instrumentations.add(...mockInstrumentations);
      instrumentations.remove(instrumentationToRemove);

      expect(instrumentations.instrumentations.map(({ name }) => name)).toEqual(expectedNames);
      expect(instrumentationToRemove.destroy).toHaveBeenCalledTimes(1);

      mockInstrumentations
        .filter((instrumentation) => instrumentation !== instrumentationToRemove)
        .forEach((instrumentation) => expect(instrumentation.destroy).not.toHaveBeenCalled());
    });

    it('removes multiple instrumentations in the order provided', () => {
      const mockInstrumentations = createMockInstrumentations();
      const instrumentations = createInstrumentations();

      instrumentations.add(...mockInstrumentations);
      instrumentations.remove(...mockInstrumentations);

      expect(instrumentations.instrumentations).toEqual([]);
      mockInstrumentations.forEach((instrumentation) => expect(instrumentation.destroy).toHaveBeenCalledTimes(1));
    });
  });
});
