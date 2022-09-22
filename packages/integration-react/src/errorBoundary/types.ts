import type { ReactElement, ReactNode } from 'react';

import type { Agent } from '@grafana/agent-web';

export type ReactNodeRender = () => ReactNode;

export type ReactProps = Record<string, any>;

export type GrafanaAgentErrorBoundaryFallbackRender = (error: Error, resetError: VoidFunction) => ReactElement;

export interface GrafanaAgentErrorBoundaryProps {
  agent?: Agent;
  beforeCapture?: (error: Error | null) => void;
  children?: ReactNode | ReactNodeRender;
  fallback?: ReactElement | GrafanaAgentErrorBoundaryFallbackRender;
  onError?: (error: Error) => void;
  onMount?: VoidFunction;
  onReset?: (error: Error | null) => void;
  onUnmount?: (error: Error | null) => void;
}

export interface GrafanaAgentErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
}
