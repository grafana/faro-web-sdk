import hoistNonReactStatics from 'hoist-non-react-statics';
import type { ComponentType, FC } from 'react';

import { unknownString } from '../utils';
import { GrafanaAgentErrorBoundary } from './GrafanaAgentErrorBoundary';
import type { GrafanaAgentErrorBoundaryProps, ReactProps } from './types';

export function withGrafanaAgentErrorBoundary<P extends ReactProps = {}>(
  WrappedComponent: ComponentType<P>,
  errorBoundaryProps: GrafanaAgentErrorBoundaryProps
): FC<P> {
  const componentDisplayName = WrappedComponent.displayName ?? WrappedComponent.name ?? unknownString;

  const Component: FC<P> = (wrappedComponentProps: P) => (
    <GrafanaAgentErrorBoundary {...errorBoundaryProps}>
      <WrappedComponent {...wrappedComponentProps} />
    </GrafanaAgentErrorBoundary>
  );

  Component.displayName = `grafanaAgentErrorBoundary(${componentDisplayName})`;

  hoistNonReactStatics(Component, WrappedComponent);

  return Component;
}
