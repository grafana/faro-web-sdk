import type { Attributes } from '@opentelemetry/api';
import type { ComponentType, FunctionComponent } from 'react';

import { TraceScope, TraceScopeContext, TraceScopeProvider, useTraceScope } from './TraceScopeContext';

export interface WithTraceScopeProps {
  scope: TraceScope;
}

type PropsToAttrs<T> = (props: T) => Attributes;

export function withSpan<T>(
  name: string,
  propsToAttrs: PropsToAttrs<T> | undefined,
  WrappedComponent: ComponentType<T | (T & WithTraceScopeProps)>
): ComponentType<T> {
  let Child = WrappedComponent;
  if (!WrappedComponent.prototype?.render) {
    Child = ((props: T & WithTraceScopeProps) =>
      props.scope.withContext(() => (WrappedComponent as FunctionComponent<T>)(props))) as typeof WrappedComponent;
  }

  return function WithTraceScope(props: T) {
    return (
      <TraceScopeProvider name={name} attributes={propsToAttrs?.(props) ?? {}}>
        <TraceScopeContext.Consumer>
          {(scope) => <Child {...(props as T & JSX.IntrinsicAttributes)} scope={scope} />}
        </TraceScopeContext.Consumer>
      </TraceScopeProvider>
    );
  };
}

export function withTraceContext<T>(fn: (props: T) => JSX.Element): (props: T) => JSX.Element {
  return (props: T) => {
    const scope = useTraceScope();
    return scope.withContext(() => fn(props));
  };
}
