import { BaseInstrumentation, stringifyObjectValues, VERSION } from '@grafana/faro-core';
import type { Instrumentation } from '@grafana/faro-core';

export class CSPInstrumentation extends BaseInstrumentation implements Instrumentation {
  readonly name = '@grafana/faro-web-sdk:instrumentation-csp';
  readonly version: string = VERSION;

  // Bound once here rather than in initialize, because removeEventListener matches listeners by
  // identity. Binding inside initialize created a new function object every time, so the listener
  // destroy tried to remove was never the one that had been registered: it stayed attached and kept
  // reporting violations after the instrumentation had been removed.
  private readonly boundSecuritypolicyviolationHandler: (ev: SecurityPolicyViolationEvent) => void =
    this.securitypolicyviolationHandler.bind(this);

  constructor() {
    super();
  }

  initialize(): void {
    document.addEventListener('securitypolicyviolation', this.boundSecuritypolicyviolationHandler);
  }

  destroy(): void {
    document.removeEventListener('securitypolicyviolation', this.boundSecuritypolicyviolationHandler);
  }

  public securitypolicyviolationHandler(ev: SecurityPolicyViolationEvent): void {
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
