import type { ReactElement, ReactNode } from 'react';

export type ReactNodeRender = () => ReactNode;

export type ReactProps = Record<string, any>;

export type FaroErrorBoundaryFallbackRender = (error: Error, resetError: VoidFunction) => ReactElement;

export interface FaroErrorBoundaryProps {
  beforeCapture?: (error: Error | null) => void;
  children?: ReactNode | ReactNodeRender;
  fallback?: ReactElement | FaroErrorBoundaryFallbackRender;
  onError?: (error: Error) => void;
  onMount?: VoidFunction;
  onReset?: (error: Error | null) => void;
  onUnmount?: (error: Error | null) => void;
}

export interface FaroErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
}
