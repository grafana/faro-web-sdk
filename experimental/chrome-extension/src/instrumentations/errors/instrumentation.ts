import { BaseInstrumentation, VERSION } from '@grafana/faro-core';
import { getStackFramesFromError } from '@grafana/faro-web-sdk';

export class ExtensionErrorsInstrumentation extends BaseInstrumentation {
  readonly name = '@grafana/faro-chrome-extension:instrumentation-errors';
  readonly version = VERSION;

  initialize(): void {
    this.logDebug('Initializing');

    self.addEventListener('error', (event) => {
      const error = (event as ErrorEvent).error ?? new Error((event as ErrorEvent).message ?? 'Unknown error');

      try {
        const stackFrames = getStackFramesFromError(error);
        this.api.pushError(error, {
          stackFrames,
          type: error.name ?? 'Error',
        });
      } catch {
        this.api.pushError(error);
      }
    });

    self.addEventListener('unhandledrejection', (event) => {
      const rejectionEvent = event as PromiseRejectionEvent;
      const reason = rejectionEvent.reason;

      if (reason instanceof Error) {
        try {
          const stackFrames = getStackFramesFromError(reason);
          this.api.pushError(reason, {
            stackFrames,
            type: 'UnhandledRejection',
          });
        } catch {
          this.api.pushError(reason, { type: 'UnhandledRejection' });
        }
      } else {
        this.api.pushError(new Error(String(reason ?? 'Unhandled rejection')), {
          type: 'UnhandledRejection',
        });
      }
    });
  }
}
