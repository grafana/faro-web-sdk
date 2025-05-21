import type { SpanContext } from '@opentelemetry/api';
import { ESpanKind, type IResourceSpans } from '@opentelemetry/otlp-transformer/build/src/trace/internal-types';

import { faro, unknownString } from '@grafana/faro-web-sdk';
import type { EventAttributes as FaroEventAttributes } from '@grafana/faro-web-sdk';

const DURATION_NS_KEY = 'duration_ns';

export function sendFaroEvents(resourceSpans: IResourceSpans[] = []) {
  for (const resourceSpan of resourceSpans) {
    const { scopeSpans } = resourceSpan;

    for (const scopeSpan of scopeSpans) {
      const { scope, spans = [] } = scopeSpan;

      for (const span of spans) {
        if (span.kind !== ESpanKind.SPAN_KIND_CLIENT) {
          continue;
        }

        const spanContext: Pick<SpanContext, 'traceId' | 'spanId'> = {
          traceId: span.traceId.toString(),
          spanId: span.spanId.toString(),
        };

        const faroEventAttributes: FaroEventAttributes = {};
        for (const attribute of span.attributes) {
          faroEventAttributes[attribute.key] = String(Object.values(attribute.value)[0]);
        }

        // Add span duration in nanoseconds
        if (!Number.isNaN(span.endTimeUnixNano) && !Number.isNaN(span.startTimeUnixNano)) {
          faroEventAttributes[DURATION_NS_KEY] = String(Number(span.endTimeUnixNano) - Number(span.startTimeUnixNano));
        }

        const index = (scope?.name ?? '').indexOf('-');
        let eventName = unknownString;

        if (scope?.name) {
          if (index === -1) {
            eventName = scope.name.split('/')[1] ?? scope.name;
          }

          if (index > -1) {
            eventName = scope?.name.substring(index + 1);
          }
        }

        faro.api.pushEvent(`faro.tracing.${eventName}`, faroEventAttributes, undefined, {
          spanContext,
          // Convert nanoseconds to milliseconds
          timestampOverwriteMs: Number(span.endTimeUnixNano) / 1_000_000,
          customPayloadTransformer: (payload) => {
            if (
              faroEventAttributes['faro.action.user.name'] != null &&
              faroEventAttributes['faro.action.user.parentId'] != null
            ) {
              payload.action = {
                name: faroEventAttributes['faro.action.user.name'],
                parentId: faroEventAttributes['faro.action.user.parentId'],
              };

              delete payload.attributes?.['faro.action.user.name'];
              delete payload.attributes?.['faro.action.user.parentId'];
            }

            return payload;
          },
        });
      }
    }
  }
}
