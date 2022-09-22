import hoistNonReactStatics from 'hoist-non-react-statics';
import type { ComponentType, FC } from 'react';

import { unknownString } from '../utils';
import { GrafanaProfiler } from './GrafanaProfiler';
import type { GrafanaProfilerProps } from './GrafanaProfiler';

export function withGrafanaProfiler<P extends Record<string, any>>(
  WrappedComponent: ComponentType<P>,
  options?: Omit<GrafanaProfilerProps, 'updateProps'>
): FC<P> {
  const componentDisplayName = options?.name ?? WrappedComponent.displayName ?? WrappedComponent.name ?? unknownString;

  const Component: FC<P> = (props: P) => (
    <GrafanaProfiler name={componentDisplayName} updateProps={props}>
      <WrappedComponent {...props} />
    </GrafanaProfiler>
  );

  Component.displayName = `grafanaProfiler(${componentDisplayName})`;

  hoistNonReactStatics(Component, WrappedComponent);

  return Component;
}
