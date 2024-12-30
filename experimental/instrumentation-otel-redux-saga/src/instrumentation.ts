import * as api from '@opentelemetry/api';
import {Span, SpanStatusCode} from '@opentelemetry/api';
import {InstrumentationBase} from '@opentelemetry/instrumentation';
import type {InstrumentationConfig} from '@opentelemetry/instrumentation';
import type {SagaMonitor} from 'redux-saga';
import type {PutEffect} from 'redux-saga/effects';


export interface ReduxSagaInstrumentationConfig extends InstrumentationConfig {
  // Add any custom config fields you'd like here.
  // For example, you might ignore certain effect types, or customize naming, etc.
  shouldPropagateTraceContextPut?: (effect: PutEffect) => boolean;
  propagateContextToCall?: boolean
}

/**
 * A minimal SagaMonitor-based instrumentation for Redux-Saga.
 */
export class ReduxSagaInstrumentation extends InstrumentationBase<ReduxSagaInstrumentationConfig> {
  private _spans: Map<number, Span> = new Map();

  constructor(config: ReduxSagaInstrumentationConfig = {}) {
    super('@grafana/redux-saga-instrumentation', '1.0.0', config);
  }

  init() {}

  /**
   * Returns a custom sagaMonitor that starts/ends spans for saga effects.
   */
  public getSagaMonitor(): SagaMonitor {
    const instrumentation = this;

    const sagaMonitor: SagaMonitor = {
      effectTriggered(info) {
        try {
          // Called when a new effect is triggered (e.g. call, put, take, fork, etc.)
          const { effectId, effect } = info;
          const args = effect?.payload?.args;
          const payload = args?.[0]?.payload;
          const traceparent = payload?.traceparent;
          const traceable = args?.[2]?.traceable;

          if (traceparent) {
            const parentContext = api.propagation.extract(api.context.active(), payload);
            const spanName = instrumentation._getEffectName(effect);
            const span = instrumentation.tracer.startSpan(
                spanName,
                {
                  kind: api.SpanKind.CLIENT
                },
                parentContext
            );
            instrumentation._spans.set(effectId, span);

            return;
          }

          const parentId = info?.parentEffectId;

          const parentSpan = instrumentation._spans.get(parentId);

          if (parentSpan) {
            const spanName = instrumentation._getEffectName(effect);

            // Use the parent span's context to create a child span
            const childSpan = instrumentation.tracer.startSpan(
                spanName,
                { kind: api.SpanKind.CLIENT},
                api.trace.setSpan(api.context.active(), parentSpan)
            );

            if (effect.type === 'PUT' && instrumentation._config.shouldPropagateTraceContextPut?.(effect)) {
              const effectPayload = { ...(effect.payload.action.payload || {}) };
              api.propagation.inject(api.trace.setSpan(api.context.active(), childSpan), effectPayload);
              effect.payload.action.payload = effectPayload;
            }

            if (effect.type === 'CALL') {
              const childContext = api.trace.setSpan(api.context.active(), childSpan);
              effect.payload.fn = api.context.bind(childContext, effect.payload.fn);
            }

            instrumentation._spans.set(effectId, childSpan);
          } else if (traceable){
            const spanName = instrumentation._getEffectName(effect);
            const span =  instrumentation.tracer.startSpan(
                spanName,
                {
                  kind: api.SpanKind.CLIENT
                }
            );
            instrumentation._spans.set(effectId, span);
          }
        } catch (e) {
          instrumentation._diag.error('Error in effectTriggered', e);
        }
      },

      effectResolved(effectId: number, result: any) {
        try {
          // Called when an effect has completed successfully
          const span = instrumentation._spans.get(effectId);
          if (!span) {return;}

          if (result?.toPromise) {
            result.toPromise().then((res: any) => {
              // You can add any final attributes or set success
              span.setStatus({ code: SpanStatusCode.OK });
              span.end();
              instrumentation._spans.delete(effectId);
              return res;
            });
          } else {
            span.setStatus({ code: SpanStatusCode.OK });
            span.end();
            instrumentation._spans.delete(effectId);
          }
        } catch (e) {
          instrumentation._diag.error('Error in effectResolved', e);
        }
      },

      effectRejected(effectId, error) {
        try {
          // Called when an effect has failed
          const span = instrumentation._spans.get(effectId);
          if (!span) {return;}

          span.setStatus({ code: SpanStatusCode.ERROR, message: error?.message });
          span.recordException(error);
          span.end();
          instrumentation._spans.delete(effectId);
        } catch (e) {
          instrumentation._diag.error('Error in effectRejected', e);
        }
      },

      effectCancelled(effectId) {
        try {
          // Called when an effect has been cancelled
          const span = instrumentation._spans.get(effectId);
          if (!span) {return;}

          // You might mark it as a cancellation, or success, or custom
          span.setAttribute('redux-saga.cancelled', true);
          span.end();
          instrumentation._spans.delete(effectId);
        } catch (e) {
          instrumentation._diag.error('Error in effectCancelled', e);
        }
      },
    };

    return sagaMonitor;
  }

  /**
   * Patches logic: (No real "patch" is needed for redux-saga, we just provide the saga monitor.)
   */
  override enable() {
    // No actual patching of library code required;
    // we'll just provide the custom saga monitor to the saga middleware.
  }

  /**
   * Unpatch logic: (Remove references or cleanup if needed.)
   */
  override disable() {
    // If needed, clear out the spans map or do any cleanup
    this._spans.clear();
  }

  /**
   * Helper: Return a name for the effect (like "call: fetchData" or "put: SOME_ACTION")
   */
  private _getEffectName(effect: any): string {
    if (effect && typeof effect === 'object') {
      if (effect.type === 'CALL') {
        // effect.payload.fn can be the function being called
        const fnName = effect.payload.fn?.name || 'anonymous';

        return `redux-saga call(${fnName})`;
      }
      if (effect.type === 'PUT') {
        const actionType = effect.payload?.action?.type || 'unknown';

        return `redux-saga put(${actionType})`;
      }

      if (effect.type === 'FORK') {
        const fnName = effect.payload.fn?.name || 'anonymous';

        return `redux-saga fork(${fnName})`;
      }

      if (effect.type === 'SELECT') {
        return `redux-saga select(${effect.payload?.selector?.name || 'anonymous'})`;
      }

      return `redux-saga ${effect.type.toLowerCase()}`;
    }
    return 'redux-saga effect';
  }
}
