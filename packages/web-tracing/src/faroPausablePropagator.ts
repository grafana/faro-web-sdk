import type { Context, TextMapGetter, TextMapPropagator, TextMapSetter } from '@opentelemetry/api';

/**
 * Wraps a propagator so that no trace context is written onto outgoing requests while Faro is
 * paused. Pausing already stops signals from being sent, but the OTel propagator is registered
 * globally and kept injecting `traceparent`, which made a paused SDK look like it was still
 * tracking. See https://github.com/grafana/faro-web-sdk/issues/710.
 *
 * Extraction stays enabled while paused: reading an incoming trace context sends nothing, and
 * dropping it would detach a resumed session from the trace it belongs to.
 */
export class FaroPausablePropagator implements TextMapPropagator {
  constructor(
    private readonly propagator: TextMapPropagator,
    private readonly isPaused: () => boolean
  ) {}

  inject(context: Context, carrier: unknown, setter: TextMapSetter): void {
    if (this.isPaused()) {
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
