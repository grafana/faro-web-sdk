import type { Config } from '../config';
import type { InternalLogger } from '../internalLogger';
import type { Instrumentation, Instrumentations } from './types';

export function initializeInstrumentations(internalLogger: InternalLogger, _config: Config): Instrumentations {
  internalLogger.debug('Initializing instrumentations');

  const instrumentations: Instrumentation[] = [];

  const add: Instrumentations['add'] = (...newInstrumentations) => {
    internalLogger.debug('Adding instrumentations');

    newInstrumentations.forEach((newInstrumentation) => {
      internalLogger.debug(`Adding "${newInstrumentation.name}" instrumentation`);

      const exists = instrumentations.some(
        (existingInstrumentation) => existingInstrumentation.name === newInstrumentation.name
      );

      if (exists) {
        internalLogger.warn(`Transport ${newInstrumentation.name} is already added`);

        return;
      }

      instrumentations.push(newInstrumentation);
      newInstrumentation.initialize();
    });
  };

  const remove: Instrumentations['remove'] = (...instrumentationsToRemove) => {
    internalLogger.debug('Removing instrumentations');

    instrumentationsToRemove.forEach((instrumentationToRemove) => {
      internalLogger.debug(`Removing "${instrumentationToRemove.name}" instrumentation`);

      const existingInstrumentationIndex = instrumentations.reduce<number | null>(
        (acc, existingInstrumentation, existingTransportIndex) => {
          if (acc === null && existingInstrumentation.name === instrumentationToRemove.name) {
            return existingTransportIndex;
          }

          return null;
        },
        null
      );

      if (!existingInstrumentationIndex) {
        internalLogger.warn(`Instrumentation "${instrumentationToRemove.name}" is not added`);

        return;
      }

      instrumentations[existingInstrumentationIndex]!.destroy?.();
      instrumentations.splice(existingInstrumentationIndex, 1);
    });
  };

  return {
    add,
    get instrumentations() {
      return [...instrumentations];
    },
    remove,
  };
}
