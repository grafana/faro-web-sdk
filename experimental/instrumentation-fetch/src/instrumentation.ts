import { BaseInstrumentation, globalObject, VERSION } from '@grafana/faro-core';

import { fetchGlobalObjectKey, originalFetch, originalFetchGlobalObjectKey } from './constants';
import type { FetchError } from './types';

export class FetchInstrumentation extends BaseInstrumentation {
  readonly name = '@grafana/faro-web-sdk:instrumentation-fetch';
  readonly version = VERSION;

  initialize(): void {
    this.internalLogger.info('Initializing FetchInstrumentation');
    this.enable();
  }

  /**
   * Instrument fetch with Faro
   */
  private _instrumentFetch(): typeof fetch {
    return function instrumentedFetch(this: typeof globalThis, ...args: Parameters<typeof fetch>): Promise<Response> {
      const self = this;
      const url = args[0] instanceof Request ? args[0].url : String(args[0]);
      const options = args[0] instanceof Request ? args[0] : args[1] || {};

      function onSuccess(resolve: (value: Response | PromiseLike<Response>) => void, response: Response): void {
        try {
          const resClone = response.clone();
          const body = resClone.body;

          console.log(body);
        } finally {
          console.log('success!');
          resolve(response);
        }
      }

      function onError(reject: (reason?: unknown) => void, error: FetchError) {
        try {
          console.log(error.message, ' - error!');
        } finally {
          reject(error);
        }
      }

      return new Promise((resolve, reject) => {
        return () => {
          // add headers
          return (
            originalFetch
              // TODO - add logic to pass params appropriately based on whether or not the first argument is a Request object
              .apply(self, options instanceof Request ? [options] : [url, options])
              .then(onSuccess.bind(self, resolve), onError.bind(self, reject))
          );
        };
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
