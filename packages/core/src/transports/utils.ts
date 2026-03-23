import type { IResourceSpans } from '@opentelemetry/otlp-transformer/build/src/trace/internal-types';

import type { EventEvent, ExceptionEvent, LogEvent, MeasurementEvent, TraceEvent } from '..';

import { TransportItemType, transportItemTypeToBodyKey } from './const';
import type { TransportBody, TransportItem } from './types';

export function mergeResourceSpans(traces?: TraceEvent, resourceSpans?: IResourceSpans[]): TraceEvent | undefined {
  if (resourceSpans === undefined) {
    return traces;
  }

  if (traces === undefined) {
    return { resourceSpans };
  }

  const currentResource = traces.resourceSpans?.[0];
  if (currentResource === undefined) {
    return traces;
  }

  const newSpans = resourceSpans?.[0]?.scopeSpans || [];
  const mergedSpans = (currentResource.scopeSpans || []).concat(newSpans);

  return {
    ...traces,
    resourceSpans: [{ ...currentResource, scopeSpans: mergedSpans }],
  };
}

export function getTransportBody(item: TransportItem[]): TransportBody {
  const body: TransportBody = {
    meta: {},
  };

  if (item[0] !== undefined) {
    body.meta = item[0].meta;
  }

  for (const currentItem of item) {
    switch (currentItem.type) {
      case TransportItemType.LOG:
      case TransportItemType.EVENT:
      case TransportItemType.EXCEPTION:
      case TransportItemType.MEASUREMENT: {
        const bk = transportItemTypeToBodyKey[currentItem.type];
        const signals = body[bk] as LogEvent[] | EventEvent[] | ExceptionEvent[] | MeasurementEvent[] | undefined;

        if (signals === undefined) {
          (body as any)[bk] = [currentItem.payload];
        } else {
          signals.push(currentItem.payload as any);
        }
        break;
      }
      case TransportItemType.TRACE: {
        body.traces = mergeResourceSpans(body.traces, (currentItem.payload as TraceEvent).resourceSpans);
        break;
      }
    }
  }

  return body;
}
