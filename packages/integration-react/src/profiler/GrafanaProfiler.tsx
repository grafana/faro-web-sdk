import type { Attributes, Span, Tracer } from '@opentelemetry/api';
import { Component } from 'react';
import type { ReactNode } from 'react';

import type { OTELApi } from '@grafana/agent-web';
import { agent, VERSION } from '@grafana/agent-web';

export interface GrafanaProfilerProps {
  children: ReactNode;
  name: string;
  updateProps: Record<string, unknown>;
}

export class GrafanaProfiler extends Component<GrafanaProfilerProps> {
  protected mountSpan: Span | undefined = undefined;
  protected mountSpanEndTime: number | undefined = undefined;
  protected updateSpan: Span | undefined = undefined;

  private get isOtelInitialized(): boolean {
    return !!agent.api?.isOTELInitialized();
  }

  private get otel(): OTELApi | undefined {
    return agent.api?.getOTEL()!;
  }

  private get tracer(): Tracer {
    return this.otel?.trace.getTracer('@grafana/agent-integration-react', VERSION)!;
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

  constructor(props: GrafanaProfilerProps) {
    super(props);

    if (this.isOtelInitialized) {
      this.mountSpan = this.createSpan('componentMount');
    } else {
      agent.internalLogger?.error(
        'The Grafana React Profiler requires tracing instrumentation. Please enable it in the "instrumentations" section of your config.'
      );
    }
  }

  override componentDidMount(): void {
    if (this.isOtelInitialized && this.mountSpan) {
      this.mountSpanEndTime = Date.now();
      this.mountSpan.end(this.mountSpanEndTime);
    }
  }

  override shouldComponentUpdate({ updateProps }: GrafanaProfilerProps): boolean {
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
    if (this.isOtelInitialized && this.mountSpan) {
      this.createChildSpan('componentRender', this.mountSpan, {
        startTime: this.mountSpanEndTime,
        endTime: Date.now(),
      });
    }
  }

  override render(): ReactNode {
    return this.props.children;
  }
}
