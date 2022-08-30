import type { Agent } from '@grafana/agent-web';
import type { ErrorInfo, ReactElement, ReactNode } from 'react';

export type ReactNodeRender = () => ReactNode;

export type ReactProps = Record<string, any>;

export type ErrorBoundaryFallbackRender = (
  error: Error,
  componentStack: string | null,
  resetError: VoidFunction
) => ReactElement;

export interface ErrorBoundaryProps {
  agent?: Agent;
  beforeCapture?: (error: Error | null, componentStack: string | null) => void;
  children?: ReactNode | ReactNodeRender;
  fallback?: ReactElement | ErrorBoundaryFallbackRender;
  onError?: (error: Error, componentStack: string) => void;
  onMount?: VoidFunction;
  onReset?: (error: Error | null, componentStack: string | null) => void;
  onUnmount?: (error: Error | null, componentStack: string | null) => void;
}

export interface ErrorBoundaryState {
  componentStack: ErrorInfo['componentStack'] | null;
  error: Error | null;
}

export interface ErrorWithCause extends Error {
  cause?: Error;
}
