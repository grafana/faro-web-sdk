import { BaseInstrumentation, VERSION, isString, isPrimitive } from '@grafana/agent-core';
export { parseStacktrace } from './stackFrames';
import type { ExceptionStackFrame } from '@grafana/agent-core';

import { primitiveUnhandledType, primitiveUnhandledValue , unknownString } from './const';
import type { ExtendedPromiseRejectionEvent } from './extendedPromiseRejectionEvent';
import { getErrorDetails } from './getErrorDetails';
import { getValueAndTypeFromMessage } from './getValueAndTypeFromMessage';
import { buildStackFrame } from './stackFrames';

export class ErrorsInstrumentation extends BaseInstrumentation {
  readonly version = VERSION;
  readonly name = '@grafana/agent-web:instrumentation-errors';

  private oldOnerrorHandler: OnErrorEventHandler | undefined
  private unhandledRejectionHandler: (event: ExtendedPromiseRejectionEvent) => void

  constructor() {
    super()
    this.unhandledRejectionHandler = this.handleUnhandledRejection.bind(this)
  }

  initialize(): void {
    this.unpatch()
    this.registerOnerror()
    this.registerOnUnhandledRejection()
  }

  shutdown(): void {
    this.unpatch()
  }

  private unpatch() {
    if (this.oldOnerrorHandler) {
      window.onerror = this.oldOnerrorHandler
    } else {
      window.onerror = () => {}
    }
    window.removeEventListener('unhandledrejection', this.unhandledRejectionHandler)
  }

  private registerOnUnhandledRejection() {
    window.addEventListener('unhandledrejection', this.unhandledRejectionHandler)
  }

  private handleUnhandledRejection(event: ExtendedPromiseRejectionEvent) {
    let error = event;

    if (error.reason) {
      error = event.reason;
    } else if (event.detail?.reason) {
      error = event.detail?.reason;
    }

    let value: string | undefined;
    let type: string | undefined;

    if (isPrimitive(error)) {
      value = `${primitiveUnhandledValue} ${String(error)}`;
      type = primitiveUnhandledType;
    } else {
      [value, type] = getErrorDetails(error);
    }

    if (value) {
      this.agent.api.pushError(new Error(value), { type });
    }
  }

  private registerOnerror() {
   // The error event is a little bit different than other events when it comes to the listener
  // window.addEventListener does not provide all parameters, hence we need to use the window.onerror syntax
  // TODO: investigate https://developer.mozilla.org/en-US/docs/Web/API/GlobalEventHandlers/onerror

    this.oldOnerrorHandler = window.onerror

    window.onerror = (...args) => {
      const [event, source, lineno, colno, error] = args;
      let value: string | undefined;
      let type: string | undefined;
      let stackFrames: ExceptionStackFrame[] = [];
      const eventIsString = isString(event);
      const initialStackFrame = buildStackFrame(source, unknownString, lineno, colno);

      if (error || !eventIsString) {
        [value, type, stackFrames] = getErrorDetails((error ?? event) as Error | Event);

        if (stackFrames.length === 0) {
          stackFrames = [initialStackFrame];
        }
      } else if (eventIsString) {
        [value, type] = getValueAndTypeFromMessage(event);
        stackFrames = [initialStackFrame];
      }

      if (value) {
        this.agent.api.pushError(new Error(value), { type, stackFrames });
      }

      if (this.oldOnerrorHandler) {
        this.oldOnerrorHandler.apply(window, args)
      }
    };
  }
}
