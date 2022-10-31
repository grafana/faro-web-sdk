import { BaseInstrumentation, VERSION } from '@grafana/faro-web-sdk';

import { initializeReactRouterInstrumentation } from './router';
import type { ReactIntegrationConfig } from './types';

export class ReactIntegration extends BaseInstrumentation {
  name = '@grafana/faro-react';
  version = VERSION;

  constructor(private config: ReactIntegrationConfig = {}) {
    super();
  }

  initialize(): void {
    initializeReactRouterInstrumentation(this.config, this.faro);
  }
}
