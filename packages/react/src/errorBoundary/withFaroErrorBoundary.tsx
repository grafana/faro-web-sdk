import hoistNonReactStatics from 'hoist-non-react-statics';
import type { ComponentType, FC } from 'react';

import { unknownString } from '../utils';

import { FaroErrorBoundary } from './FaroErrorBoundary';
import type { FaroErrorBoundaryProps, ReactProps } from './types';

export function withFaroErrorBoundary<P extends ReactProps = {}>(
  WrappedComponent: ComponentType<P>,
  errorBoundaryProps: FaroErrorBoundaryProps
): FC<P> {
  const componentDisplayName = WrappedComponent.displayName ?? WrappedComponent.name ?? unknownString;

  const Component: FC<P> = (wrappedComponentProps: P) => (
    <FaroErrorBoundary {...errorBoundaryProps}>
      <WrappedComponent {...wrappedComponentProps} />
    </FaroErrorBoundary>
  );

  Component.displayName = `faroErrorBoundary(${componentDisplayName})`;

  hoistNonReactStatics(Component, WrappedComponent);

  return Component;
}
