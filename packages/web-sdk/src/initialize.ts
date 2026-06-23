import { initializeFaro as coreInit, createInternalLogger } from '@grafana/faro-core';
import type { Faro } from '@grafana/faro-core';

import { makeCoreConfig } from './config';
import type { BrowserConfig } from './config';
import { engageRemoteConfig, prepareRemoteConfig } from './remoteConfig';

export function initializeFaro(config: BrowserConfig): Faro {
  const coreConfig = makeCoreConfig(config);

  if (!coreConfig) {
    return undefined!;
  }

  // Opt-in remote config. Synchronous: the network fetch + sampling decision happen internally via
  // the defer-and-buffer lifecycle, so the consumer never awaits. When `remoteConfig` is absent,
  // initialization behavior is unchanged. The pre-init phase may apply a warm-cache rate to
  // `coreConfig` before the session decision is made.
  const remoteConfigPrep = config.remoteConfig
    ? prepareRemoteConfig({
        config: coreConfig,
        collectorUrl: config.url,
        options: config.remoteConfig,
        internalLogger: createInternalLogger(coreConfig.unpatchedConsole, coreConfig.internalLoggerLevel),
      })
    : undefined;

  const faro = coreInit(coreConfig);

  if (faro && remoteConfigPrep) {
    engageRemoteConfig(faro, remoteConfigPrep);
  }

  return faro;
}
