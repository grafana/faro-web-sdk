import type { Span } from '@opentelemetry/api';
import { XMLHttpRequestInstrumentation } from '@opentelemetry/instrumentation-xml-http-request';
import type { XMLHttpRequestInstrumentationConfig } from '@opentelemetry/instrumentation-xml-http-request';
import { OpenFunction } from '@opentelemetry/instrumentation-xml-http-request/build/src/types';

type Parent = {
  _createSpan: (xhr: XMLHttpRequest, url: string, method: string) => Span | undefined;
};

export class FaroXhrWrapper extends XMLHttpRequestInstrumentation {
  private parentCreateSpan: Parent['_createSpan'];

  constructor(config: XMLHttpRequestInstrumentationConfig = {}) {
    super(config);

    const self = this as any as Parent;
    this.parentCreateSpan = self._createSpan.bind(this);
  }

  protected override _patchOpen() {
    return (original: OpenFunction): OpenFunction => {
      const plugin = this;
      return function patchOpen(this: XMLHttpRequest, ...args): void {
        const method: string = args[0];
        const url: string = args[1];

        console.log('method :>> ', method);
        console.log('url :>> ', url);

        plugin.parentCreateSpan(this, url, method);

        return original.apply(this, args);
      };
    };
  }
}
