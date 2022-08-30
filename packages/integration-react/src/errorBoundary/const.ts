import type { ErrorBoundaryState } from './types';

export const errorBoundaryInitialState: ErrorBoundaryState = {
  componentStack: null,
  error: null,
} as const;
