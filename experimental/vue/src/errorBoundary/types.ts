import type { ComponentPublicInstance, VNode } from 'vue';

import type { PushErrorOptions } from '@grafana/faro-web-sdk';

export interface FaroErrorBoundaryProps {
  /**
   * Called before the error is captured and sent to Faro
   */
  beforeCapture?: (error: Error | null) => void;

  /**
   * Fallback content to render when an error is caught
   */
  fallback?: VNode | ((error: Error, reset: () => void) => VNode);

  /**
   * Called after the error is captured
   */
  onError?: (error: Error, instance: ComponentPublicInstance | null, info: string) => void;

  /**
   * Called when the error boundary is reset
   */
  onReset?: (error: Error | null) => void;

  /**
   * Options to pass to api.pushError
   */
  pushErrorOptions?: PushErrorOptions;
}

export interface FaroErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
  errorInfo: string | null;
}

export interface UseFaroErrorBoundaryOptions extends FaroErrorBoundaryProps {}
