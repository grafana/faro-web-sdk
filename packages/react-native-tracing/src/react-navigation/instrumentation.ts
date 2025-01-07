import { BaseInstrumentation, VERSION } from '@grafana/faro-core';

import { setDependencies } from './dependencies';
import { metaPage } from './metaPage';

export class ReactNavigationIntegration extends BaseInstrumentation {
  name = '@grafana/faro-react-native-navigation-tracing';
  version = VERSION;

  constructor() {
    super();
  }

  initialize(): void {
    setDependencies(this.internalLogger, this.api);
    this.metas.add(metaPage);
  }
}
