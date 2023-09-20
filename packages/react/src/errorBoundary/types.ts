import type { ReactElement, ReactNode } from 'react';

import type { PushErrorOptions } from '@grafana/faro-web-sdk';

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
  pushErrorOptions?: PushErrorOptions;
}

export interface FaroErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
}
