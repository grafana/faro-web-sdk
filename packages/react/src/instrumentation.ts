import { BaseInstrumentation, VERSION } from '@grafana/faro-web-sdk';

import { setDependencies } from './dependencies';
import { initializeReactRouterInstrumentation } from './router';
import type { ReactIntegrationConfig } from './types';

export class ReactIntegration extends BaseInstrumentation {
  name = '@grafana/faro-react';
  version = VERSION;

  private routerInstrumented: boolean = false;

  constructor(private options: ReactIntegrationConfig = {}) {
    super();
  }

  isRouterInstrumented(): boolean {
    return this.routerInstrumented;
  }

  initialize(): void {
    setDependencies(this.internalLogger, this.api);
    initializeReactRouterInstrumentation(this.options);

    this.routerInstrumented = this.options.router !== undefined;
  }
}
