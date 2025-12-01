import type { FaroErrorBoundaryState } from './types';

export const faroErrorBoundaryInitialState: FaroErrorBoundaryState = {
  hasError: false,
  error: null,
} as const;
