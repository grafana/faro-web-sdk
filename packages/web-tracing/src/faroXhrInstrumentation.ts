import type { Span } from '@opentelemetry/api';
import { XMLHttpRequestInstrumentation } from '@opentelemetry/instrumentation-xml-http-request';
import type { XMLHttpRequestInstrumentationConfig } from '@opentelemetry/instrumentation-xml-http-request';
import type { OpenFunction } from '@opentelemetry/instrumentation-xml-http-request/build/src/types';

import { faro, getUrlFromResource, type UserActionInternalInterface, UserActionState } from '@grafana/faro-web-sdk';

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
        let span: Span | undefined;
        try {
          const method: string = args[0];
          let url: string | URL = getUrlFromResource(args[1])!;

          span = plugin.parentCreateSpan(this, url, method);
        } catch (error) {
          faro.internalLogger.error(error);
        }

        const currentAction = faro.api.getActiveUserAction();
        if (
          span &&
          currentAction &&
          (currentAction as unknown as UserActionInternalInterface)?.getState() === UserActionState.Started
        ) {
          span.setAttribute('faro.action.user.name', currentAction.name);
          span.setAttribute('faro.action.user.parentId', currentAction.parentId);
        }

        return original.apply(this, args);
      };
    };
  }
}
