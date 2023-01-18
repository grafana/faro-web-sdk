import { initializeAPI } from './api';
import type { Config } from './config';
import { initializeInstrumentations, registerInitialInstrumentations } from './instrumentations';
import { initializeInternalLogger } from './internalLogger';
import { initializeMetas, registerInitialMetas } from './metas';
import { isInternalFaroOnGlobalObject, registerFaro } from './sdk';
import type { Faro } from './sdk';
import { initializeTransports, registerInitialTransports } from './transports';
import { initializeUnpatchedConsole } from './unpatchedConsole';

export function initializeFaro(config: Config): Faro {
  const unpatchedConsole = initializeUnpatchedConsole(config);
  const internalLogger = initializeInternalLogger(unpatchedConsole, config);

  if (isInternalFaroOnGlobalObject() && !config.isolate) {
    internalLogger.error(
      'Faro is already registered. Either add instrumentations, transports etc. to the global faro instance or use the "isolate" property'
    );

    return undefined!;
  }

  internalLogger.debug('Initializing');

  // Initializing the APIs
  const metas = initializeMetas(unpatchedConsole, internalLogger, config);
  const transports = initializeTransports(unpatchedConsole, internalLogger, config, metas);
  const api = initializeAPI(unpatchedConsole, internalLogger, config, metas, transports);
  const instrumentations = initializeInstrumentations(unpatchedConsole, internalLogger, config, metas, transports, api);
  const faro = registerFaro(unpatchedConsole, internalLogger, config, metas, transports, api, instrumentations);

  // make sure Faro is initialized before registering default metas, instrumentations, transports etc.
  registerInitialMetas(faro);
  registerInitialTransports(faro);
  registerInitialInstrumentations(faro);

  return faro;
}
