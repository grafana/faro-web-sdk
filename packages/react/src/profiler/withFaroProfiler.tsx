import hoistNonReactStatics from 'hoist-non-react-statics';
import type { ComponentType, FC } from 'react';

import { unknownString } from '../utils';

import { FaroProfiler } from './FaroProfiler';
import type { FaroProfilerProps } from './FaroProfiler';

export function withFaroProfiler<P extends Record<string, any>>(
  WrappedComponent: ComponentType<P>,
  options?: Omit<FaroProfilerProps, 'updateProps'>
): FC<P> {
  const componentDisplayName = options?.name ?? WrappedComponent.displayName ?? WrappedComponent.name ?? unknownString;

  const Component: FC<P> = (props: P) => (
    <FaroProfiler name={componentDisplayName} updateProps={props}>
      <WrappedComponent {...props} />
    </FaroProfiler>
  );

  Component.displayName = `faroProfiler(${componentDisplayName})`;

  hoistNonReactStatics(Component, WrappedComponent);

  return Component;
}
