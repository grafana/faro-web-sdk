import { context, ProxyTracerProvider, trace } from '@opentelemetry/api';
import type { Context, Span, SpanOptions, Tracer, TracerOptions, TracerProvider } from '@opentelemetry/api';

import type { AttributionStrategy } from './attributionResolver';
import type { TracingRegistration } from './tracingRegistry';

export interface RoutingSpanResolution {
  registration?: TracingRegistration;
  strategy?: AttributionStrategy;
  fallback?: boolean;
  suppressed?: boolean;
  shouldSuppress?: () => boolean;
  isSuppressed?: () => boolean;
}

export type RoutingRegistrationResolver = (
  spanOptions: SpanOptions,
  instrumentationScopeName?: string
) => RoutingSpanResolution | undefined;

/**
 * A page-level tracer provider that selects an app at span creation time while preserving the
 * instrumentation scope and parent context supplied by OpenTelemetry.
 */
export class RoutingTracerProvider implements TracerProvider {
  private readonly tracers = new Map<string, RoutingTracer>();
  private readonly noOpProvider = new ProxyTracerProvider();
  private readonly requestDecisions = new WeakMap<Span, RoutingSpanResolution>();

  constructor(private readonly resolveRegistration: RoutingRegistrationResolver) {}

  shouldSuppressActiveSpan(): boolean {
    const activeSpan = trace.getActiveSpan();
    return activeSpan ? this.requestDecisions.get(activeSpan)?.shouldSuppress?.() === true : false;
  }

  getResolution(span: Span): RoutingSpanResolution | undefined {
    return this.requestDecisions.get(span);
  }

  shouldBypassNetworkRequest(url: string, instrumentationScopeName: string): boolean {
    const resolution = this.resolveRegistration({ attributes: { 'url.full': url } }, instrumentationScopeName);
    return !resolution?.registration || resolution.suppressed === true || resolution.shouldSuppress?.() === true;
  }

  getTracer(name: string, version?: string, options?: TracerOptions): Tracer {
    // The scope name/version identify the tracer; keep the options on the first tracer created for
    // that scope rather than serializing arbitrary user objects (which may be circular).
    const key = `${name}\u0000${version ?? ''}\u0000${options?.schemaUrl ?? ''}`;
    let tracer = this.tracers.get(key);

    if (!tracer) {
      tracer = new RoutingTracer(
        name,
        version,
        options,
        this.resolveRegistration,
        this.noOpProvider,
        (span, resolution) => this.rememberDecision(span, resolution),
        (parentContext) => this.getInheritedDecision(parentContext)
      );
      this.tracers.set(key, tracer);
    }

    return tracer;
  }

  private rememberDecision(span: Span, resolution: RoutingSpanResolution): void {
    if (resolution.registration || resolution.strategy !== undefined) {
      this.requestDecisions.set(span, resolution);
    }
  }

  private getInheritedDecision(parentContext?: Context): RoutingSpanResolution | undefined {
    const parentSpan = trace.getSpan(parentContext ?? context.active());
    return parentSpan ? this.requestDecisions.get(parentSpan) : undefined;
  }
}

class RoutingTracer implements Tracer {
  constructor(
    private readonly name: string,
    private readonly version: string | undefined,
    private readonly tracerOptions: TracerOptions | undefined,
    private readonly resolveRegistration: RoutingRegistrationResolver,
    private readonly noOpProvider: TracerProvider,
    private readonly rememberDecision: (span: Span, resolution: RoutingSpanResolution) => void,
    private readonly getInheritedDecision: (parentContext?: Context) => RoutingSpanResolution | undefined
  ) {}

  startSpan(name: string, options: SpanOptions = {}, parentContext?: Context): Span {
    const target = this.getTarget(name, options, parentContext);
    const span = target.tracer.startSpan(name, target.options, parentContext);
    const wrappedSpan = this.wrapSuppressedEnd(span, target.resolution);
    this.rememberDecision(wrappedSpan, target.resolution);
    return wrappedSpan;
  }

  startActiveSpan<F extends (span: Span) => unknown>(name: string, fn: F): ReturnType<F>;
  startActiveSpan<F extends (span: Span) => unknown>(name: string, options: SpanOptions, fn: F): ReturnType<F>;
  startActiveSpan<F extends (span: Span) => unknown>(
    name: string,
    options: SpanOptions,
    context: Context,
    fn: F
  ): ReturnType<F>;
  startActiveSpan<F extends (span: Span) => unknown>(
    name: string,
    optionsOrFn: SpanOptions | F,
    contextOrFn?: Context | F,
    maybeFn?: F
  ): ReturnType<F> {
    const options = typeof optionsOrFn === 'function' ? undefined : optionsOrFn;
    const context = options && contextOrFn && typeof contextOrFn !== 'function' ? contextOrFn : undefined;
    let callback: F | undefined;

    if (typeof optionsOrFn === 'function') {
      callback = optionsOrFn;
    } else if (typeof contextOrFn === 'function') {
      callback = contextOrFn;
    } else {
      callback = maybeFn;
    }

    if (!callback) {
      throw new TypeError('RoutingTracer.startActiveSpan requires a callback');
    }

    const target = this.getTarget(name, options, context);
    const callbackWithDecision =
      target.resolution.strategy === undefined && !target.resolution.shouldSuppress
        ? callback
        : (span: Span) => {
            const wrappedSpan = this.wrapSuppressedEnd(span, target.resolution);
            this.rememberDecision(wrappedSpan, target.resolution);
            return callback!(wrappedSpan);
          };

    if (options && context) {
      return target.tracer.startActiveSpan(name, target.options, context, callbackWithDecision) as ReturnType<F>;
    }

    if (options) {
      return target.tracer.startActiveSpan(name, target.options, callbackWithDecision) as ReturnType<F>;
    }

    return target.tracer.startActiveSpan(name, callbackWithDecision) as ReturnType<F>;
  }

  private getTarget(
    name: string,
    options?: SpanOptions,
    parentContext?: Context
  ): {
    tracer: Tracer;
    options: SpanOptions;
    resolution: RoutingSpanResolution;
  } {
    const spanOptions = options ?? {};
    const isFetchCorsAuxiliary =
      this.name === '@opentelemetry/instrumentation-fetch' &&
      name === 'CORS Preflight' &&
      spanOptions.attributes?.['url.full'] === undefined;
    const inheritedResolution = isFetchCorsAuxiliary ? this.getInheritedDecision(parentContext) : undefined;
    if (inheritedResolution && isFetchCorsAuxiliary) {
      const parentSpan = trace.getSpan(parentContext ?? context.active());
      if (parentSpan) {
        inheritedResolution.registration?.allowAuxiliarySpan?.(parentSpan);
      }
    }
    const resolution = inheritedResolution ?? this.resolveRegistration(spanOptions, this.name) ?? {};
    const provider =
      resolution.suppressed === true ? this.noOpProvider : (resolution.registration?.provider ?? this.noOpProvider);
    const routedOptions =
      resolution?.strategy === undefined
        ? spanOptions
        : {
            ...spanOptions,
            attributes: {
              ...(spanOptions.attributes ?? {}),
              'faro.attribution.strategy': resolution.strategy,
              'faro.attribution.fallback': resolution.fallback === true,
            },
          };

    return {
      tracer: provider.getTracer(this.name, this.version, this.tracerOptions),
      options: routedOptions,
      resolution,
    };
  }

  private wrapSuppressedEnd(span: Span, resolution: RoutingSpanResolution): Span {
    if (resolution.suppressed === true || !resolution.shouldSuppress) {
      return span;
    }

    const end = span.end.bind(span);
    let ended = false;
    span.end = (endTime?: Parameters<Span['end']>[0]) => {
      if (ended) {
        return;
      }

      ended = true;
      const suppressed =
        resolution.suppressed === true ||
        (resolution.isSuppressed ? resolution.isSuppressed() : resolution.shouldSuppress?.());
      if (suppressed) {
        resolution.registration?.onSpanDropped?.(span);
        return;
      }

      end(endTime);
    };

    return span;
  }
}
