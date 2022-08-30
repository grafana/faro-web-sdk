import { BaseInstrumentation, VERSION } from '@grafana/agent-web';

import { initializeReactRouterInstrumentation } from './router';
import type { ReactIntegrationConfig } from './types';

export class ReactIntegration extends BaseInstrumentation {
  name = '@grafana/agent-integration-react';
  version = VERSION;

  constructor(private config: ReactIntegrationConfig = {}) {
    super();
  }

  initialize(): void {
    initializeReactRouterInstrumentation(this.config, this.agent);
  }
}
