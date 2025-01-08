import type { IResourceSpans } from '@opentelemetry/otlp-transformer/build/src/trace/internal-types';

import {
  EventEvent,
  ExceptionEvent,
  getTransportBody,
  LogEvent,
  Meta,
  TraceEvent,
  TransportItem,
  TransportItemType,
} from '..';
import { getCurrentTimestamp, LogLevel } from '../utils';

import { mergeResourceSpans } from './utils';

describe('utils', () => {
  describe('mergeResourceSpans', () => {
    it('tests merging with empty traces or resourceSpans', () => {
      expect(mergeResourceSpans()).toEqual(undefined);
    });

    it('tests merging with empty traces and some resourceSpans', () => {
      const rs = [generateResourceSpan('thisspan')];
      expect(mergeResourceSpans(undefined, rs)).toEqual({ resourceSpans: rs });
    });

    it('tests merging with traces that do not have a resource and resourceSpans', () => {
      let traces = generateTraceEvent('trace');
      traces.payload.resourceSpans = [];
      const rs = [generateResourceSpan('thisspan')];
      expect(mergeResourceSpans(traces.payload, rs)).toEqual({ resourceSpans: [] });
    });

    it('tests merging with traces and resourceSpans', () => {
      let traces = generateTraceEvent('trace');
      const rs = [generateResourceSpan('thisspan')];
      expect(mergeResourceSpans(traces.payload, rs)).toEqual({
        ...traces.payload,
        resourceSpans: [
          {
            ...(traces.payload.resourceSpans?.[0] || []),
            scopeSpans: [...(traces.payload.resourceSpans?.[0]?.scopeSpans || []), ...(rs[0]?.scopeSpans || [])],
          },
        ],
      });
    });
  });

  describe('getTransportBody', () => {
    it('test creating a body with a single item', () => {
      const log = generateLog('This is a log');
      const body = getTransportBody([log]);
      expect(body).toEqual({
        logs: [log.payload],
        meta: {},
      });
    });

    it('test creating a body with a two items of the same type', () => {
      const log1 = generateLog('This is a log');
      const log2 = generateLog('This is also a log');
      const body = getTransportBody([log1, log2]);
      expect(body).toEqual({
        logs: [log1.payload, log2.payload],
        meta: {},
      });
    });

    it('test creating a body with a items different type (no trace)', () => {
      const log = generateLog('This is a log');
      const event = generateEvent('session_start');
      const exception = generateException('TypeError');

      const body = getTransportBody([log, event, exception]);
      expect(body).toEqual({
        logs: [log.payload],
        events: [event.payload],
        exceptions: [exception.payload],
        meta: {},
      });
    });

    it('test creating a body with a items different type (with traces)', () => {
      const log1 = generateLog('This is a log');
      const log2 = generateLog('This is also a log');
      const trace1 = generateTraceEvent('session_start');
      const trace2 = generateTraceEvent('session_end');

      const body = getTransportBody([log1, log2, trace1, trace2]);
      expect(body).toEqual({
        logs: [log1.payload, log2.payload],
        traces: {
          resourceSpans: [
            {
              resource: trace1.payload.resourceSpans?.[0]?.resource,
              scopeSpans: [
                ...(trace1.payload.resourceSpans?.[0]?.scopeSpans || []),
                ...(trace2.payload.resourceSpans?.[0]?.scopeSpans || []),
              ],
            },
          ],
        },
        meta: {},
      });
    });
  });
});

function generateLog(message: string, meta: Meta = {}): TransportItem<LogEvent> {
  return {
    type: TransportItemType.LOG,
    payload: {
      context: {},
      level: LogLevel.LOG,
      message,
      timestamp: getCurrentTimestamp(),
    },
    meta,
  };
}

function generateException(value: string, meta: Meta = {}): TransportItem<ExceptionEvent> {
  return {
    type: TransportItemType.EXCEPTION,
    payload: {
      value,
      type: 'exception',
      timestamp: getCurrentTimestamp(),
    },
    meta,
  };
}

function generateEvent(name: string, meta: Meta = {}): TransportItem<EventEvent> {
  return {
    type: TransportItemType.EVENT,
    payload: {
      name,
      timestamp: getCurrentTimestamp(),
    },
    meta,
  };
}

function generateResourceSpan(name: string): IResourceSpans {
  return {
    resource: {
      attributes: [],
      droppedAttributesCount: 0,
    },
    scopeSpans: [
      {
        scope: {
          name: '@opentelemetry/instrumentation-document-load',
          version: '0.31.0',
        },
        spans: [
          {
            traceId: 'd6bba34860089d3a4ee58df0811b2f5f',
            spanId: '22c85dd7b7c674e8',
            parentSpanId: '16cff06b28240ca6',
            name: 'resourceFetch',
            kind: 1,
            startTimeUnixNano: 1679329154423000000,
            endTimeUnixNano: 1679329154449000000,
            attributes: [
              {
                key: 'session_id',
                value: {
                  stringValue: 'KBw5UzUuvF',
                },
              },
              {
                key: 'component',
                value: {
                  stringValue: 'document-load',
                },
              },
              {
                key: 'http.url',
                value: {
                  stringValue:
                    'http://localhost:5173/@fs/Users/marcoschaefer/Code/faro-web-sdk/packages/web-sdk/dist/esm/transports/otlp/index.js?t=1679329135042',
                },
              },
              {
                key: 'http.response_content_length',
                value: {
                  intValue: 671,
                },
              },
            ],
            droppedAttributesCount: 0,
            events: [
              {
                attributes: [],
                name,
                timeUnixNano: 1679329154423000000,
                droppedAttributesCount: 0,
              },
            ],
            droppedEventsCount: 0,
            status: {
              code: 0,
            },
            links: [],
            droppedLinksCount: 0,
          },
        ],
      },
    ],
  };
}

function generateTraceEvent(name: string, meta: Meta = {}): TransportItem<TraceEvent> {
  return {
    type: TransportItemType.TRACE,
    payload: {
      resourceSpans: [generateResourceSpan(name)],
    },
    meta,
  };
}
