import type { ErrorUtils } from 'react-native';

import { BaseInstrumentation } from '@grafana/faro-core';

import {
  enhanceErrorWithContext,
  getPlatformErrorContext,
  getStackFramesFromError,
} from './stackTraceParser';

// Access the global ErrorUtils
declare const global: {
  ErrorUtils: ErrorUtils;
  addEventListener?: (event: string, handler: any) => void;
  removeEventListener?: (event: string, handler: any) => void;
};

type ErrorHandlerCallback = (error: any, isFatal?: boolean) => void;

export interface ErrorsInstrumentationOptions {
  /**
   * Patterns to ignore errors by message
   * @example [/network timeout/i, /cancelled/i]
   */
  ignoreErrors?: RegExp[];

  /**
   * Enable error deduplication (default: true)
   * Prevents sending the same error multiple times within a time window
   */
  enableDeduplication?: boolean;

  /**
   * Deduplication time window in milliseconds (default: 5000)
   * Errors with same message/stack within this window are considered duplicates
   */
  deduplicationWindow?: number;

  /**
   * Maximum number of errors to track for deduplication (default: 50)
   * Older errors are removed when this limit is reached
   */
  maxDeduplicationEntries?: number;
}

interface ErrorFingerprint {
  message: string;
  stack: string;
  timestamp: number;
}

/**
 * Errors instrumentation for React Native
 *
 * Features:
 * - Captures unhandled errors and promise rejections using ErrorUtils
 * - Parses React Native stack traces (dev, release, Metro bundler formats)
 * - Adds platform context (OS, version, Hermes engine)
 * - Error deduplication to prevent duplicate reports
 * - Configurable error filtering
 *
 * @example
 * ```tsx
 * import { initializeFaro } from '@grafana/faro-react-native';
 * import { ErrorsInstrumentation } from '@grafana/faro-react-native';
 *
 * initializeFaro({
 *   // ...config
 *   instrumentations: [
 *     new ErrorsInstrumentation({
 *       ignoreErrors: [/network timeout/i, /cancelled/i],
 *       enableDeduplication: true,
 *       deduplicationWindow: 5000,
 *     }),
 *   ],
 * });
 * ```
 */
export class ErrorsInstrumentation extends BaseInstrumentation {
  readonly name = '@grafana/faro-react-native-errors';
  readonly version = '1.0.0';

  private originalErrorHandler?: ErrorHandlerCallback;
  private unhandledRejectionListener?: (event: PromiseRejectionEvent) => void;
  private options: Required<ErrorsInstrumentationOptions>;
  private errorFingerprints: ErrorFingerprint[] = [];

  constructor(options: ErrorsInstrumentationOptions = {}) {
    super();
    this.options = {
      ignoreErrors: options.ignoreErrors ?? [],
      enableDeduplication: options.enableDeduplication ?? true,
      deduplicationWindow: options.deduplicationWindow ?? 5000,
      maxDeduplicationEntries: options.maxDeduplicationEntries ?? 50,
    };
  }

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
        // Check if error should be ignored
        if (this.shouldIgnoreError(error)) {
          this.logDebug('Ignoring error based on ignoreErrors patterns', { message: error.message });
          return;
        }

        // Check for duplicate errors
        if (this.options.enableDeduplication && this.isDuplicateError(error)) {
          this.logDebug('Ignoring duplicate error', { message: error.message });
          return;
        }

        // Enhance error with React Native context and stack frames
        const { error: enhancedError, stackFrames, context } = enhanceErrorWithContext(error, {
          isFatal: String(isFatal ?? false),
        });

        // Push error to Faro with enhanced data
        this.api.pushError(enhancedError, {
          type: enhancedError.name || 'Error',
          context,
          stackFrames,
        });

        // Track error fingerprint for deduplication
        if (this.options.enableDeduplication) {
          this.addErrorFingerprint(error);
        }
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

        // Check if error should be ignored
        if (this.shouldIgnoreError(error)) {
          this.logDebug('Ignoring unhandled rejection based on ignoreErrors patterns', { message: error.message });
          return;
        }

        // Check for duplicate errors
        if (this.options.enableDeduplication && this.isDuplicateError(error)) {
          this.logDebug('Ignoring duplicate unhandled rejection', { message: error.message });
          return;
        }

        // Enhance error with React Native context and stack frames
        const { error: enhancedError, stackFrames, context } = enhanceErrorWithContext(error);

        this.api.pushError(enhancedError, {
          type: enhancedError.name || 'UnhandledRejection',
          context,
          stackFrames,
        });

        // Track error fingerprint for deduplication
        if (this.options.enableDeduplication) {
          this.addErrorFingerprint(error);
        }
      } catch (e) {
        this.logError('Failed to report unhandled rejection to Faro', e);
      }
    };

    // Add the listener
    global.addEventListener?.('unhandledrejection', this.unhandledRejectionListener as any);
  }

  /**
   * Check if error should be ignored based on ignoreErrors patterns
   */
  private shouldIgnoreError(error: Error): boolean {
    if (!error || !error.message) {
      return false;
    }

    return this.options.ignoreErrors.some((pattern) => pattern.test(error.message));
  }

  /**
   * Check if error is a duplicate based on message and stack
   */
  private isDuplicateError(error: Error): boolean {
    const message = error.message || '';
    const stack = error.stack || '';
    const now = Date.now();

    // Clean up old entries first
    this.cleanupOldFingerprints(now);

    // Check if we've seen this error recently
    return this.errorFingerprints.some((fingerprint) => {
      return (
        fingerprint.message === message &&
        fingerprint.stack === stack &&
        now - fingerprint.timestamp < this.options.deduplicationWindow
      );
    });
  }

  /**
   * Add error fingerprint for deduplication tracking
   */
  private addErrorFingerprint(error: Error): void {
    const message = error.message || '';
    const stack = error.stack || '';
    const timestamp = Date.now();

    this.errorFingerprints.push({ message, stack, timestamp });

    // Limit the number of tracked fingerprints
    if (this.errorFingerprints.length > this.options.maxDeduplicationEntries) {
      this.errorFingerprints.shift();
    }
  }

  /**
   * Remove error fingerprints older than the deduplication window
   */
  private cleanupOldFingerprints(now: number): void {
    this.errorFingerprints = this.errorFingerprints.filter(
      (fingerprint) => now - fingerprint.timestamp < this.options.deduplicationWindow
    );
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

    // Clear deduplication tracking
    this.errorFingerprints = [];
  }
}
