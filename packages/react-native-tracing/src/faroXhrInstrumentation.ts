import type { Span } from '@opentelemetry/api';
import { XMLHttpRequestInstrumentation } from '@opentelemetry/instrumentation-xml-http-request';
import type { XMLHttpRequestInstrumentationConfig } from '@opentelemetry/instrumentation-xml-http-request';
import type { OpenFunction } from '@opentelemetry/instrumentation-xml-http-request/build/src/types';

type Parent = {
  _createSpan: (xhr: XMLHttpRequest, url: string, method: string) => Span | undefined;
};

export class FaroXhrInstrumentation extends XMLHttpRequestInstrumentation {
  private parentCreateSpan: Parent['_createSpan'];

  constructor(config: XMLHttpRequestInstrumentationConfig = {}) {
    super(config);

    const self = this as any as Parent;
    this.parentCreateSpan = self._createSpan.bind(this);
  }

  // Patching the parent's private method to handle url type string or URL
  protected override _patchOpen() {
    return (original: OpenFunction): OpenFunction => {
      const plugin = this;
      return function patchOpen(this: XMLHttpRequest, ...args): void {
        const method: string = args[0];
        let url: string | URL = args[1];

        if (isInstanceOfURL(url)) {
          url = url.href;
        }

        plugin.parentCreateSpan(this, url, method);

        return original.apply(this, args);
      };
    };
  }
}

function isInstanceOfURL(item: any): item is URL {
  return item instanceof URL;
}
