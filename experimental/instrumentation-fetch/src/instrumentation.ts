import { BaseInstrumentation, faro, globalObject } from '@grafana/faro-core';

import { fetchGlobalObjectKey, originalFetch, originalFetchGlobalObjectKey } from './constants';

export class FetchInstrumentation extends BaseInstrumentation {
  readonly name = '@grafana/faro-web-sdk:instrumentation-fetch';
  readonly version = '1.0.0'; // TODO - pull from package.json

  initialize(): void {
    console.log('Initializing FetchInstrumentation');
    this.enable();
  }

  constructor() {
    super();
  }

  /**
   * Instrument fetch with Faro
   */
  private _instrumentFetch(): typeof fetch {
    return function instrumentedFetch(input, init): Promise<Response> {
      let copyInit = init ? Object.assign({}, init) : {};

      let body;
      if (copyInit && copyInit.body) {
        body = copyInit.body;
        copyInit.body = undefined;
      }

      const request = new Request(input, copyInit);
      if (body) {
        copyInit.body = body;
      }

      return originalFetch(input instanceof Request ? request : input, copyInit).then(function (response: Response) {
        const simplifiedHeaders = {} as Record<string, string>;
        new Headers(response.headers).forEach((v, k) => (simplifiedHeaders[`response_header_${k}`] = v));

        // TODO - add instrumented functions to capture onError and onSuccess
        faro.api.pushEvent('Response headers', simplifiedHeaders);
        return response;
      });
    };
  }

  /**
   * implements enable function
   */
  enable(): void {
    Object.defineProperty(globalObject, fetchGlobalObjectKey, {
      configurable: true,
      enumerable: false,
      writable: false,
      value: this._instrumentFetch(),
    });

    Object.defineProperty(globalObject, originalFetchGlobalObjectKey, {
      configurable: true,
      enumerable: false,
      writable: false,
      value: originalFetch,
    });
  }

  /**
   * implements disable function
   */
  disable(): void {
    Object.defineProperty(globalObject, fetchGlobalObjectKey, {
      configurable: true,
      enumerable: false,
      writable: false,
      value: originalFetch,
    });

    Object.defineProperty(globalObject, originalFetchGlobalObjectKey, {
      configurable: true,
      enumerable: false,
      writable: false,
      value: null,
    });
  }
}
