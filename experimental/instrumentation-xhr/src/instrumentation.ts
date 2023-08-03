import { BaseInstrumentation, faro, VERSION } from '@grafana/faro-core';

export class XHRInstrumentation extends BaseInstrumentation {
  readonly name = '@grafana/faro-web-sdk:instrumentation-xhr';
  readonly version = VERSION;

  initialize(): void {
    this.internalLogger.info('Initializing XHR instrumentation');

    const originalOpen = XMLHttpRequest.prototype.open;
    const originalSend = XMLHttpRequest.prototype.send;

    XMLHttpRequest.prototype.open = function (
      method: string,
      url: string | URL,
      async?: boolean,
      username?: string | null,
      password?: string | null
    ): void {
      const xhr = this;
      // IGNORED URLS HERE?

      return originalOpen.apply(xhr, [
        method,
        url,
        async === undefined ? true : !!async,
        username === undefined ? null : username,
        password === undefined ? null : password,
      ]);
    };

    XMLHttpRequest.prototype.send = function (body?: Document | XMLHttpRequestBodyInit | null | undefined): void {
      const xhr = this;

      xhr.addEventListener('load', loadEventListener.bind(xhr));
      xhr.addEventListener('abort', abortEventListener.bind(xhr));
      xhr.addEventListener('error', errorEventListener.bind(xhr));
      xhr.addEventListener('timeout', timeoutEventListener.bind(xhr));

      return originalSend.apply(xhr, [body === undefined ? null : body]);
    };

    function loadEventListener(this: XMLHttpRequest) {
      // CAPTURE LOAD DETAILS HERE
      faro.api.pushLog(['XHR load', this]);

      this.removeEventListener('load', loadEventListener);
    }

    function abortEventListener(this: XMLHttpRequest) {
      faro.api.pushLog(['XHR aborted', this]);

      this.removeEventListener('abort', abortEventListener);
    }

    function errorEventListener(this: XMLHttpRequest) {
      faro.api.pushLog(['XHR error', this]);

      this.removeEventListener('error', errorEventListener);
    }

    function timeoutEventListener(this: XMLHttpRequest) {
      faro.api.pushLog(['XHR timeout', this]);

      this.removeEventListener('timeout', timeoutEventListener);
    }
  }
}
