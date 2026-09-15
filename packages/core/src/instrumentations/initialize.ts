import type { API } from '../api';
import type { Config } from '../config';
import type { InternalLogger } from '../internalLogger';
import type { Metas } from '../metas';
import type { Transports } from '../transports';
import type { UnpatchedConsole } from '../unpatchedConsole';

import type { Instrumentation, Instrumentations } from './types';

export function initializeInstrumentations(
  unpatchedConsole: UnpatchedConsole,
  internalLogger: InternalLogger,
  config: Config,
  metas: Metas,
  transports: Transports,
  api: API
): Instrumentations {
  internalLogger.debug('Initializing instrumentations');

  const registrations: Array<{ instrumentation: Instrumentation }> = [];

  const add: Instrumentations['add'] = (...newInstrumentations) => {
    internalLogger.debug('Adding instrumentations');

    newInstrumentations.forEach((newInstrumentation) => {
      internalLogger.debug(`Adding "${newInstrumentation.name}" instrumentation`);

      const exists = registrations.some(({ instrumentation }) => instrumentation.name === newInstrumentation.name);

      if (exists) {
        internalLogger.warn(`Instrumentation ${newInstrumentation.name} is already added`);

        return;
      }

      newInstrumentation.unpatchedConsole = unpatchedConsole;
      newInstrumentation.internalLogger = internalLogger;
      newInstrumentation.config = config;
      newInstrumentation.metas = metas;
      newInstrumentation.transports = transports;
      newInstrumentation.api = api;

      const registration = { instrumentation: newInstrumentation };
      registrations.push(registration);
      try {
        newInstrumentation.initialize();
      } catch (error) {
        const index = registrations.indexOf(registration);
        if (index !== -1) {
          registrations.splice(index, 1);
          try {
            newInstrumentation.destroy?.();
          } catch (cleanupError) {
            internalLogger.warn('Failed to clean up instrumentation after initialization failure', cleanupError);
          }
        }
        throw error;
      }
    });
  };

  const remove: Instrumentations['remove'] = (...instrumentationsToRemove) => {
    internalLogger.debug('Removing instrumentations');

    const selected = instrumentationsToRemove.map((instrumentationToRemove) => {
      internalLogger.debug(`Removing "${instrumentationToRemove.name}" instrumentation`);

      const registration = registrations.find(
        ({ instrumentation }) => instrumentation.name === instrumentationToRemove.name
      );

      if (!registration) {
        internalLogger.warn(`Instrumentation "${instrumentationToRemove.name}" is not added`);
      }

      return registration;
    });

    selected.forEach((registration) => {
      if (!registration) {
        return;
      }

      const index = registrations.indexOf(registration);
      if (index !== -1) {
        registrations.splice(index, 1);
        registration.instrumentation.destroy?.();
      }
    });
  };

  return {
    add,
    get instrumentations() {
      return registrations.map(({ instrumentation }) => instrumentation);
    },
    remove,
  };
}
