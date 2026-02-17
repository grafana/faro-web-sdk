import { initializeFaro as coreInit } from '@grafana/faro-core';
import type { Faro } from '@grafana/faro-core';

import { makeCoreConfig } from './config';
import type { ChromeExtensionConfig } from './config';

export function initializeFaroForExtension(config: ChromeExtensionConfig): Faro {
  const coreConfig = makeCoreConfig(config);

  if (!coreConfig) {
    return undefined!;
  }

  return coreInit(coreConfig);
}
