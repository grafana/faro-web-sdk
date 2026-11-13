import { SpanKind, SpanStatusCode, TraceFlags } from '@opentelemetry/api';
import { ExportResultCode } from '@opentelemetry/core';
import { resourceFromAttributes } from '@opentelemetry/resources';
import type { ReadableSpan } from '@opentelemetry/sdk-trace';

import type { API } from '@grafana/faro-web-sdk';

import { FaroTraceExporter } from './faroTraceExporter';

const span: ReadableSpan = {
  name: 'GET /data',
  kind: SpanKind.CLIENT,
  spanContext: () => ({
    traceId: '12345678901234567890123456789012',
    spanId: '1234567890123456',
    traceFlags: TraceFlags.SAMPLED,
  }),
  parentSpanContext: {
    traceId: '12345678901234567890123456789012',
    spanId: '6543210987654321',
    traceFlags: TraceFlags.SAMPLED,
    isRemote: true,
  },
  startTime: [1700000000, 0],
  endTime: [1700000000, 15000000],
  duration: [0, 15000000],
  status: { code: SpanStatusCode.ERROR, message: 'request failed' },
  attributes: { 'http.method': 'GET', 'http.status_code': 503, retry: false, tags: ['a', 'b'] },
  links: [
    {
      context: {
        traceId: 'abcdefabcdefabcdefabcdefabcdefab',
        spanId: 'abcdefabcdefabcd',
        traceFlags: TraceFlags.SAMPLED,
      },
      attributes: { linked: true },
    },
  ],
  events: [{ name: 'retry', time: [1700000000, 10000000], attributes: { attempt: 1 } }],
  ended: true,
  resource: resourceFromAttributes({ 'service.name': 'test-app' }),
  instrumentationScope: { name: '@opentelemetry/instrumentation-fetch', version: '0.223.0' },
  droppedAttributesCount: 1,
  droppedEventsCount: 2,
  droppedLinksCount: 3,
};

describe('FaroTraceExporter payload compatibility', () => {
  it('preserves the trace payload and derived Faro event', () => {
    const pushTraces = jest.fn();
    const pushEvent = jest.fn();
    const callback = jest.fn();
    const api = { pushTraces, pushEvent } as unknown as API;

    new FaroTraceExporter({ api }).export([span], callback);

    // Capture the JSON payload rather than optional properties omitted on the wire.
    expect(JSON.parse(JSON.stringify(pushTraces.mock.calls[0]?.[0]))).toMatchSnapshot('trace payload');
    expect(pushEvent.mock.calls).toMatchSnapshot('derived Faro event');
    expect(callback).toHaveBeenCalledWith({ code: ExportResultCode.SUCCESS });
  });

  it('exports an empty batch without emitting Faro events', () => {
    const pushTraces = jest.fn();
    const pushEvent = jest.fn();
    const callback = jest.fn();
    const api = { pushTraces, pushEvent } as unknown as API;

    new FaroTraceExporter({ api }).export([], callback);

    expect(pushTraces).toHaveBeenCalledWith({ resourceSpans: [] });
    expect(pushEvent).not.toHaveBeenCalled();
    expect(callback).toHaveBeenCalledWith({ code: ExportResultCode.SUCCESS });
  });
});
