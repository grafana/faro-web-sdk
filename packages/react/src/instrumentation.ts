import { BaseInstrumentation, VERSION } from '@grafana/faro-web-sdk';

import { setDependencies } from './dependencies';
import { initializeReactRouterInstrumentation } from './router';
import type { ReactIntegrationConfig } from './types';

export class ReactIntegration extends BaseInstrumentation {
  name = '@grafana/faro-react';
  version = VERSION;

  constructor(private options: ReactIntegrationConfig = {}) {
    super();
  }

  initialize(): void {
    setDependencies(this.internalLogger, this.api);
    initializeReactRouterInstrumentation(this.options);
  }
}
