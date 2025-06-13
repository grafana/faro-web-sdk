import { BaseInstrumentation, stringifyObjectValues, VERSION } from '@grafana/faro-core';
import type { Instrumentation } from '@grafana/faro-core';

export class CSPInstrumentation extends BaseInstrumentation implements Instrumentation {
  readonly name = '@grafana/faro-web-sdk:instrumentation-csp';
  readonly version = VERSION;

  constructor() {
    super();
  }

  initialize() {
    document.addEventListener('securitypolicyviolation', this.securitypolicyviolationHandler.bind(this));
  }

  destroy() {
    document.removeEventListener('securitypolicyviolation', this.securitypolicyviolationHandler);
  }

  public securitypolicyviolationHandler(ev: SecurityPolicyViolationEvent) {
    this.api.pushEvent('securitypolicyviolation', stringifyObjectValues(ev as Record<string, any>));
  }
}
