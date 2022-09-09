import type { GrafanaAgentErrorBoundaryState } from './types';

export const grafanaAgentErrorBoundaryInitialState: GrafanaAgentErrorBoundaryState = {
  componentStack: null,
  error: null,
} as const;
