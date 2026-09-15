import type { Context, TextMapGetter, TextMapPropagator, TextMapSetter } from '@opentelemetry/api';

/**
 * Wraps a propagator so that no trace context is written onto outgoing requests while Faro is not
 * emitting signals for the current session. Faro withholds it for two reasons:
 *
 * - Faro is paused. Pausing already stops signals from being sent, but the OTel propagator is
 *   registered globally and kept injecting `traceparent`, which made a paused SDK look like it was
 *   still tracking. See https://github.com/grafana/faro-web-sdk/issues/710.
 * - The session is not part of the sample and `omitTraceContextForUnsampledSessions` is enabled.
 *   See https://github.com/grafana/faro-web-sdk/issues/2250.
 *
 * Extraction stays enabled in both cases: reading an incoming trace context sends nothing, and
 * dropping it would detach a resumed or later-sampled session from the trace it belongs to.
 */
export class FaroPausablePropagator implements TextMapPropagator {
  constructor(
    private readonly propagator: TextMapPropagator,
    private readonly shouldOmitTraceContext: () => boolean
  ) {}

  inject(context: Context, carrier: unknown, setter: TextMapSetter): void {
    if (this.shouldOmitTraceContext()) {
      return;
    }

    this.propagator.inject(context, carrier, setter);
  }

  extract(context: Context, carrier: unknown, getter: TextMapGetter): Context {
    return this.propagator.extract(context, carrier, getter);
  }

  fields(): string[] {
    return this.propagator.fields();
  }
}
