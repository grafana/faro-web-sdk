import type { API } from '../api';
import type { InternalLogger } from '../internalLogger';
import type { Metas } from '../metas';
import { mockConfig, mockInternalLogger } from '../testUtils';
import type { Transports } from '../transports';

import { BaseInstrumentation } from './base';
import { initializeInstrumentations } from './initialize';
import type { Instrumentations } from './types';

class MockInstrumentation extends BaseInstrumentation {
  readonly version = '1.0.0';

  initialize = jest.fn();
  destroy = jest.fn();

  constructor(readonly name: string) {
    super();
  }
}

function createInstrumentations(internalLogger: InternalLogger = mockInternalLogger): Instrumentations {
  return initializeInstrumentations(console, internalLogger, mockConfig(), {} as Metas, {} as Transports, {} as API);
}

describe('instrumentations', () => {
  describe('remove', () => {
    it('removes the first instrumentation, calls destroy, and keeps the rest', () => {
      const instrumentationA = new MockInstrumentation('A');
      const instrumentationB = new MockInstrumentation('B');
      const instrumentationC = new MockInstrumentation('C');
      const instrumentations = createInstrumentations();

      instrumentations.add(instrumentationA, instrumentationB, instrumentationC);
      instrumentations.remove(instrumentationA);

      expect(instrumentations.instrumentations.map((instrumentation) => instrumentation.name)).toEqual(['B', 'C']);
      expect(instrumentationA.destroy).toHaveBeenCalledTimes(1);
      expect(instrumentationB.destroy).not.toHaveBeenCalled();
      expect(instrumentationC.destroy).not.toHaveBeenCalled();
    });

    it('removes a middle instrumentation, calls destroy, and keeps the rest', () => {
      const instrumentationA = new MockInstrumentation('A');
      const instrumentationB = new MockInstrumentation('B');
      const instrumentationC = new MockInstrumentation('C');
      const instrumentations = createInstrumentations();

      instrumentations.add(instrumentationA, instrumentationB, instrumentationC);
      instrumentations.remove(instrumentationB);

      expect(instrumentations.instrumentations.map((instrumentation) => instrumentation.name)).toEqual(['A', 'C']);
      expect(instrumentationB.destroy).toHaveBeenCalledTimes(1);
      expect(instrumentationA.destroy).not.toHaveBeenCalled();
      expect(instrumentationC.destroy).not.toHaveBeenCalled();
    });

    it('removes the last instrumentation, calls destroy, and keeps the rest', () => {
      const instrumentationA = new MockInstrumentation('A');
      const instrumentationB = new MockInstrumentation('B');
      const instrumentationC = new MockInstrumentation('C');
      const instrumentations = createInstrumentations();

      instrumentations.add(instrumentationA, instrumentationB, instrumentationC);
      instrumentations.remove(instrumentationC);

      expect(instrumentations.instrumentations.map((instrumentation) => instrumentation.name)).toEqual(['A', 'B']);
      expect(instrumentationC.destroy).toHaveBeenCalledTimes(1);
      expect(instrumentationA.destroy).not.toHaveBeenCalled();
      expect(instrumentationB.destroy).not.toHaveBeenCalled();
    });

    it('warns and leaves the array unchanged when removing an unknown name', () => {
      const warn = jest.fn();
      const instrumentationA = new MockInstrumentation('A');
      const instrumentationB = new MockInstrumentation('B');
      const instrumentationC = new MockInstrumentation('C');
      const unknownInstrumentation = new MockInstrumentation('unknown');
      const instrumentations = createInstrumentations({
        ...mockInternalLogger,
        warn,
      });

      instrumentations.add(instrumentationA, instrumentationB, instrumentationC);
      instrumentations.remove(unknownInstrumentation);

      expect(warn).toHaveBeenCalledWith('Instrumentation "unknown" is not added');
      expect(instrumentations.instrumentations).toEqual([instrumentationA, instrumentationB, instrumentationC]);
      expect(instrumentationA.destroy).not.toHaveBeenCalled();
      expect(instrumentationB.destroy).not.toHaveBeenCalled();
      expect(instrumentationC.destroy).not.toHaveBeenCalled();
      expect(unknownInstrumentation.destroy).not.toHaveBeenCalled();
    });
  });
});
