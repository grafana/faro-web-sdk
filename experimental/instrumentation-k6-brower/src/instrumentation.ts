import { BaseInstrumentation, VERSION } from '@grafana/faro-core';

export class K6BrowserInstrumentation extends BaseInstrumentation {
  readonly name = '@grafana/faro-web-sdk:instrumentation-performance-timeline';
  readonly version = VERSION;

  constructor(private options?: unknown) {
    super();
  }

  initialize(): void {}

  private getIgnoreUrls(): Array<string | RegExp> {
    return this.transports.transports?.flatMap((transport) => transport.getIgnoreUrls());
  }
}
