import hoistNonReactStatics from 'hoist-non-react-statics';
import type { ComponentType, FC } from 'react';

import { unknownString } from '../utils';
import { ErrorBoundary } from './ErrorBoundary';
import type { ErrorBoundaryProps, ReactProps } from './types';

export function withErrorBoundary<P extends ReactProps = {}>(
  WrappedComponent: ComponentType<P>,
  errorBoundaryProps: ErrorBoundaryProps
): FC<P> {
  const componentDisplayName = WrappedComponent.displayName ?? WrappedComponent.name ?? unknownString;

  const Component: FC<P> = (wrappedComponentProps: P) => (
    <ErrorBoundary {...errorBoundaryProps}>
      <WrappedComponent {...wrappedComponentProps} />
    </ErrorBoundary>
  );

  Component.displayName = `grafanaAgentErrorBoundary(${componentDisplayName})`;

  hoistNonReactStatics(Component, WrappedComponent);

  return Component;
}
