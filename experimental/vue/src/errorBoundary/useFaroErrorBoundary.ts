import { onErrorCaptured, ref } from 'vue';
import type { Ref } from 'vue';

import { api } from '../dependencies';

import type { FaroErrorBoundaryState, UseFaroErrorBoundaryOptions } from './types';

export function useFaroErrorBoundary(options: UseFaroErrorBoundaryOptions = {}) {
  const state: Ref<FaroErrorBoundaryState> = ref({
    hasError: false,
    error: null,
    errorInfo: null,
  });

  const resetErrorBoundary = () => {
    options.onReset?.(state.value.error);
    state.value = {
      hasError: false,
      error: null,
      errorInfo: null,
    };
  };

  onErrorCaptured((err, instance, info) => {
    // Capture the error details
    const error = err instanceof Error ? err : new Error(String(err));

    // Enhance error with Vue-specific information
    const enhancedError = new Error(error.message);
    enhancedError.name = `Vue ErrorBoundary ${error.name}`;
    enhancedError.stack = error.stack;

    // Add Vue-specific context to the error
    if (info) {
      enhancedError.stack = `${enhancedError.stack}\n\nVue error info: ${info}`;
    }

    // Update state
    state.value = {
      hasError: true,
      error,
      errorInfo: info,
    };

    // Call beforeCapture hook
    options.beforeCapture?.(enhancedError);

    // Push error to Faro
    api.pushError(enhancedError, options.pushErrorOptions);

    // Call onError hook with all available information
    options.onError?.(error, instance, info);

    // Return false to prevent the error from propagating further
    return false;
  });

  return {
    state,
    resetErrorBoundary,
  };
}
