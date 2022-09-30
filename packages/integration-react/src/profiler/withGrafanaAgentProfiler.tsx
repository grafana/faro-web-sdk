import hoistNonReactStatics from 'hoist-non-react-statics';
import type { ComponentType, FC } from 'react';

import { unknownString } from '../utils';
import { GrafanaAgentProfiler } from './GrafanaAgentProfiler';
import type { GrafanaAgentProfilerProps } from './GrafanaAgentProfiler';

export function withGrafanaAgentProfiler<P extends Record<string, any>>(
  WrappedComponent: ComponentType<P>,
  options?: Omit<GrafanaAgentProfilerProps, 'updateProps'>
): FC<P> {
  const componentDisplayName = options?.name ?? WrappedComponent.displayName ?? WrappedComponent.name ?? unknownString;

  const Component: FC<P> = (props: P) => (
    <GrafanaAgentProfiler name={componentDisplayName} updateProps={props}>
      <WrappedComponent {...props} />
    </GrafanaAgentProfiler>
  );

  Component.displayName = `grafanaAgentProfiler(${componentDisplayName})`;

  hoistNonReactStatics(Component, WrappedComponent);

  return Component;
}
