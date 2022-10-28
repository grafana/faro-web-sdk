import type { GrafanaAgentErrorBoundaryState } from './types';

export const grafanaAgentErrorBoundaryInitialState: GrafanaAgentErrorBoundaryState = {
  hasError: false,
  error: null,
} as const;
