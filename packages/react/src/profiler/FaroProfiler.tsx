import type { Attributes, Span, Tracer } from '@opentelemetry/api';
// React is required in scope for JSX transformation with the classic transform
// @ts-expect-error - TS6133: React appears unused but is required for JSX
// eslint-disable-next-line @typescript-eslint/no-unused-vars
import React, { Component } from 'react';
import type { ReactNode } from 'react';

import { VERSION } from '@grafana/faro-web-sdk';
import type { OTELApi } from '@grafana/faro-web-sdk';

import { api, internalLogger } from '../dependencies';

export interface FaroProfilerProps {
  children: ReactNode;
  name: string;
  updateProps: Record<string, unknown>;
}

export class FaroProfiler extends Component<FaroProfilerProps> {
  protected mountSpan: Span | undefined = undefined;
  protected renderSpan: Span | undefined = undefined;
  protected updateSpan: Span | undefined = undefined;

  private get isOtelInitialized(): boolean {
    return !!api?.isOTELInitialized();
  }

  private get otel(): OTELApi | undefined {
    return api?.getOTEL()!;
  }

  private get tracer(): Tracer {
    return this.otel?.trace.getTracer('@grafana/faro-react', VERSION)!;
  }

  private createSpan(
    spanName: string,
    options?: { startTime?: number; endTime?: number; attributes?: Attributes }
  ): Span {
    const span = this.tracer.startSpan(spanName, {
      startTime: options?.startTime,
      attributes: {
        'react.component.name': this.props.name,
        ...(options?.attributes ?? {}),
      },
    });

    this.otel?.trace.setSpan(this.otel.context.active(), span);

    if (options?.endTime) {
      span.end(options.endTime);
    }

    return span;
  }

  private createChildSpan(
    spanName: string,
    parent: Span,
    options?: { startTime?: number; endTime?: number; attributes?: Attributes }
  ): Span {
    let span: Span;

    this.otel?.context.with(this.otel.trace.setSpan(this.otel.context.active(), parent), () => {
      span = this.createSpan(spanName, options);
    });

    return span!;
  }

  constructor(props: FaroProfilerProps) {
    super(props);

    if (this.isOtelInitialized) {
      this.mountSpan = this.createSpan('componentMount');
    } else {
      internalLogger?.error(
        'The Faro React Profiler requires tracing instrumentation. Please enable it in the "instrumentations" section of your config.'
      );
    }
  }

  override componentDidMount(): void {
    if (this.isOtelInitialized && this.mountSpan) {
      // Let OTel stamp the end via its hrTime helper (`performance.timeOrigin +
      // performance.now()`), which is monotonic. Passing `Date.now()` here would mix the
      // wall clock with the mount span's start time (auto-stamped by OTel from hrTime),
      // making `endTime - startTime` drift with NTP / DST / manual clock changes.
      this.mountSpan.end();

      // Start the `componentRender` span immediately. It covers the live, mounted lifetime
      // of the component and is ended in `componentWillUnmount`. By starting and ending it
      // without explicit timestamps, both boundaries are stamped from OTel hrTime
      // (monotonic). This avoids the wall-clock issues of the previous implementation
      // which captured `Date.now()` here and subtracted it from another `Date.now()` at
      // unmount — a problem that compounded over a long-lived component (router/app
      // shells can live for the entire session).
      this.renderSpan = this.createChildSpan('componentRender', this.mountSpan);
    }
  }

  override shouldComponentUpdate({ updateProps }: FaroProfilerProps): boolean {
    if (this.isOtelInitialized && this.mountSpan && updateProps !== this.props.updateProps) {
      const changedProps = Object.keys(updateProps).filter((key) => updateProps[key] !== this.props.updateProps[key]);

      if (changedProps.length > 0) {
        this.updateSpan = this.createChildSpan('componentUpdate', this.mountSpan, {
          attributes: {
            'react.component.changed_props': changedProps,
          },
        });
      }
    }

    return true;
  }

  override componentDidUpdate(): void {
    if (this.isOtelInitialized && this.updateSpan) {
      this.updateSpan.end();
      this.updateSpan = undefined;
    }
  }

  override componentWillUnmount(): void {
    if (this.isOtelInitialized && this.renderSpan) {
      // End via OTel hrTime (monotonic). See `componentDidMount` for rationale.
      this.renderSpan.end();
      this.renderSpan = undefined;
    }
  }

  override render(): ReactNode {
    return this.props.children;
  }
}
