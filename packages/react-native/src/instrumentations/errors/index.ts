import type { ErrorUtils } from 'react-native';

import { BaseInstrumentation } from '@grafana/faro-core';

// Access the global ErrorUtils
declare const global: {
  ErrorUtils: ErrorUtils;
  addEventListener?: (event: string, handler: any) => void;
  removeEventListener?: (event: string, handler: any) => void;
};

type ErrorHandlerCallback = (error: any, isFatal?: boolean) => void;

/**
 * Errors instrumentation for React Native
 * Captures unhandled errors and promise rejections using ErrorUtils
 */
export class ErrorsInstrumentation extends BaseInstrumentation {
  readonly name = '@grafana/faro-react-native-errors';
  readonly version = '1.0.0';

  private originalErrorHandler?: ErrorHandlerCallback;
  private unhandledRejectionListener?: (event: PromiseRejectionEvent) => void;

  initialize(): void {
    this.logInfo('Initializing errors instrumentation');

    // Capture unhandled JavaScript errors
    this.setupGlobalErrorHandler();

    // Capture unhandled promise rejections
    this.setupUnhandledRejectionHandler();
  }

  private setupGlobalErrorHandler(): void {
    // Store the original error handler
    this.originalErrorHandler = global.ErrorUtils.getGlobalHandler();

    // Set our custom handler
    global.ErrorUtils.setGlobalHandler((error: Error, isFatal?: boolean) => {
      try {
        // Push error to Faro
        this.api.pushError(error, {
          type: error.name || 'Error',
          context: {
            isFatal: String(isFatal ?? false),
          },
        });
      } catch (e) {
        // Don't let error reporting cause more errors
        this.logError('Failed to report error to Faro', e);
      } finally {
        // Always call the original handler to maintain normal error behavior
        if (this.originalErrorHandler) {
          this.originalErrorHandler(error, isFatal);
        }
      }
    });
  }

  private setupUnhandledRejectionHandler(): void {
    // React Native supports the standard unhandledrejection event
    this.unhandledRejectionListener = (event: PromiseRejectionEvent) => {
      try {
        const reason = event.reason;

        // Convert reason to an Error if it isn't one
        let error: Error;
        if (reason instanceof Error) {
          error = reason;
        } else {
          error = new Error(
            `Unhandled Promise Rejection: ${typeof reason === 'object' ? JSON.stringify(reason) : String(reason)}`
          );
        }

        this.api.pushError(error, {
          type: error.name || 'UnhandledRejection',
        });
      } catch (e) {
        this.logError('Failed to report unhandled rejection to Faro', e);
      }
    };

    // Add the listener
    global.addEventListener?.('unhandledrejection', this.unhandledRejectionListener as any);
  }

  unpatch(): void {
    // Restore original error handler
    if (this.originalErrorHandler) {
      global.ErrorUtils.setGlobalHandler(this.originalErrorHandler);
    }

    // Remove unhandled rejection listener
    if (this.unhandledRejectionListener) {
      global.removeEventListener?.('unhandledrejection', this.unhandledRejectionListener as any);
    }
  }
}
