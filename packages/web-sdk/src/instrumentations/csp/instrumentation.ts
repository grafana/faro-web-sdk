import { BaseInstrumentation, stringifyObjectValues, VERSION } from '@grafana/faro-core';
import type { Instrumentation } from '@grafana/faro-core';

export class CSPInstrumentation extends BaseInstrumentation implements Instrumentation {
  readonly name = '@grafana/faro-web-sdk:instrumentation-csp';
  readonly version = VERSION;
  readonly securitypolicyviolationListener = this.securitypolicyviolationHandler.bind(this);

  constructor() {
    super();
  }

  initialize() {
    document.addEventListener('securitypolicyviolation', this.securitypolicyviolationListener);
  }

  destroy() {
    document.removeEventListener('securitypolicyviolation', this.securitypolicyviolationListener);
  }

  public securitypolicyviolationHandler(ev: SecurityPolicyViolationEvent) {
    // We must explicitly extract properties because SecurityPolicyViolationEvent
    // properties are getters on the prototype chain, not own enumerable properties.
    // Object.entries() would not capture them.
    const attributes = {
      blockedURI: ev.blockedURI,
      columnNumber: ev.columnNumber,
      disposition: ev.disposition,
      documentURI: ev.documentURI,
      effectiveDirective: ev.effectiveDirective,
      lineNumber: ev.lineNumber,
      originalPolicy: ev.originalPolicy,
      referrer: ev.referrer,
      sample: ev.sample,
      sourceFile: ev.sourceFile,
      statusCode: ev.statusCode,
      violatedDirective: ev.violatedDirective,
    };

    this.api.pushEvent('securitypolicyviolation', stringifyObjectValues(attributes));
  }
}
