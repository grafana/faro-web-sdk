import { initializeAPI } from './api';
import type { Config } from './config';
import { initializeInstrumentations } from './instrumentations';
import { initializeInternalLogger } from './internalLogger';
import { initializeMetas } from './metas';
import type { Faro } from './sdk';
import { isInternalFaroOnGlobalObject, registerFaro } from './sdk';
import { initializeTransports } from './transports';
import { initializeUnpatchedConsole } from './unpatchedConsole';

export function initializeFaro(config: Config): Faro {
  const unpatchedConsole = initializeUnpatchedConsole(config);
  const internalLogger = initializeInternalLogger(unpatchedConsole, config);

  internalLogger.debug('Initializing');

  if (isInternalFaroOnGlobalObject() && !config.isolate) {
    internalLogger.error(
      'Faro is already registered. Either add instrumentations, transports etc. to the global faro instance or use the "isolate" property'
    );

    return undefined!;
  }

  const metas = initializeMetas(internalLogger, config);
  const transports = initializeTransports(internalLogger, config);
  const api = initializeAPI(internalLogger, config, transports, metas);

  if (config.session) {
    api.setSession(config.session);
  }

  const faro = registerFaro(internalLogger, {
    api,
    config,
    internalLogger,
    metas,
    pause: transports.pause,
    transports,
    unpatchedConsole,
    unpause: transports.unpause,
    instrumentations: initializeInstrumentations(internalLogger, config),
  });

  // make sure Faro is initialized before initializing instrumentations
  faro.instrumentations.add(...config.instrumentations);

  return faro;
}
