import type { ErrorInfo, ReactElement, ReactNode } from 'react';

import type { Agent } from '@grafana/agent-web';

export type ReactNodeRender = () => ReactNode;

export type ReactProps = Record<string, any>;

export type GrafanaAgentErrorBoundaryFallbackRender = (
  error: Error,
  componentStack: string | null,
  resetError: VoidFunction
) => ReactElement;

export interface GrafanaAgentErrorBoundaryProps {
  agent?: Agent;
  beforeCapture?: (error: Error | null, componentStack: string | null) => void;
  children?: ReactNode | ReactNodeRender;
  fallback?: ReactElement | GrafanaAgentErrorBoundaryFallbackRender;
  onError?: (error: Error, componentStack: string) => void;
  onMount?: VoidFunction;
  onReset?: (error: Error | null, componentStack: string | null) => void;
  onUnmount?: (error: Error | null, componentStack: string | null) => void;
}

export interface GrafanaAgentErrorBoundaryState {
  componentStack: ErrorInfo['componentStack'] | null;
  error: Error | null;
}
