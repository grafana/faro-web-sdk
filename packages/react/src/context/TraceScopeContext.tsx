import type { Attributes, Context, Span, Tracer } from '@opentelemetry/api';
import React, { useMemo } from 'react';

import { VERSION } from '@grafana/faro-web-sdk';
import type { OTELApi } from '@grafana/faro-web-sdk';

import { api } from '../dependencies';

const RENDER_TIMEOUT_MS = 250;

export class TraceScope {
  name: string;
  parent?: TraceScope;

  private currentSpan?: Span;
  private currentContext?: Context;
  private stopTimeout?: NodeJS.Timeout;

  constructor(name: string, parent?: TraceScope) {
    this.name = name;
    this.parent = parent;
  }

  private get otel(): OTELApi | undefined {
    return api?.getOTEL()!;
  }

  private get tracer(): Tracer {
    return this.otel?.trace.getTracer('@grafana/faro-react', VERSION)!;
  }

  start(attributes?: Attributes): void {
    if (!this.currentSpan) {
      const parentContext = this.parent?.getCurrentContext() ?? this.otel?.context.active();
      if (parentContext) {
        this.currentSpan = this.tracer.startSpan(this.name, { attributes: attributes ?? {} }, parentContext);
        this.currentContext = this.otel?.trace.setSpan(parentContext, this.currentSpan);
        this.resetStopTimeout();
      }
    }
  }

  withContext<T>(fn: () => T): T {
    const context = this.getCurrentContext();
    if (context) {
      return this.otel!.context.with(context, fn);
    }
    return fn();
  }

  startActiveSpan<T>(spanName: string, attributes: Attributes, fn: (span: Span | undefined) => T): T {
    const context = this.getCurrentContext();
    if (context) {
      return this.tracer.startActiveSpan(spanName, { attributes }, context, fn);
    }
    return fn(undefined);
  }

  getCurrentContext(): Context | undefined {
    if (this.currentContext) {
      this.resetStopTimeout();
      return this.currentContext;
    }
    return undefined;
  }

  stop(): void {
    if (this.currentSpan) {
      this.currentSpan.end();
      this.currentSpan = this.currentContext = undefined;
      if (this.stopTimeout) {
        clearTimeout(this.stopTimeout);
        this.stopTimeout = undefined;
      }
    }
  }

  private resetStopTimeout() {
    if (this.stopTimeout) {
      clearTimeout(this.stopTimeout);
    }

    this.stopTimeout = setTimeout(() => {
      this.stop();
    }, RENDER_TIMEOUT_MS);
  }
}

export const TraceScopeContext = React.createContext<TraceScope>(new TraceScope('default'));

interface TraceProviderProps {
  children: React.ReactNode;
  name: string;
  attributes?: Attributes;
}

export function TraceScopeProvider({ children, name, attributes }: TraceProviderProps): JSX.Element {
  const parent = useTraceScope();
  const scope = useMemo(() => {
    const scope = new TraceScope(name, parent);
    scope.start(attributes);
    return scope;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [name, parent]);

  scope.start(attributes);

  return <TraceScopeContext.Provider value={scope}>{children}</TraceScopeContext.Provider>;
}

export function useTraceScope(): TraceScope {
  return React.useContext(TraceScopeContext);
}
