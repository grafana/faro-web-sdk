import { initializeAPI } from './api';
import type { Config } from './config';
import { initializeInstrumentations } from './instrumentations';
import { initializeInternalLogger } from './internalLogger';
import { initializeMetas, Meta } from './metas';
import type { Faro } from './sdk';
import { isInternalFaroOnGlobalObject, registerFaro } from './sdk';
import { initializeTransports } from './transports';
import { initializeUnpatchedConsole } from './unpatchedConsole';
import { VERSION } from './version';

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
  const initial: Meta = {
    sdk: {
      name: '@grafana/faro-core',
      version: VERSION,
      integrations: config.instrumentations.map(({ name, version }) => ({ name, version })),
    },
  };

  if (config.session) {
    api.setSession(config.session);
  }

  if (config.app) {
    initial.app = config.app;
  }

  if (config.user) {
    initial.user = config.user;
  }

  faro.metas.add(initial, ...(config.metas ?? []));
  faro.transports.add(...config.transports);
  faro.transports.addBeforeSendHooks(config.beforeSend);
  faro.transports.addIgnoreErrorsPatterns(config.ignoreErrors);
  faro.instrumentations.add(...config.instrumentations);

  return faro;
}
