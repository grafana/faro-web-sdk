import { ExportResultCode } from '@opentelemetry/core';
import { BasicTracerProvider, ReadableSpan } from '@opentelemetry/sdk-trace-base';

import { initializeFaro } from '@grafana/faro-core';
import { mockConfig, MockTransport } from '@grafana/faro-core/src/testUtils';

import { FaroTraceExporter } from './faroTraceExporter';

describe('FaroTraceExporter', () => {
  let transport: MockTransport;
  let provider: BasicTracerProvider;
  let faro: any;

  beforeEach(() => {
    transport = new MockTransport();
    faro = initializeFaro(
      mockConfig({
        transports: [transport],
      })
    );
    provider = new BasicTracerProvider();
  });

  afterEach(() => {
    transport.items = [];
  });

  it('should export spans successfully', (done) => {
    const exporter = new FaroTraceExporter({ api: faro.api });

    const tracer = provider.getTracer('test');
    const span = tracer.startSpan('test-span');
    span.end();

    const readableSpan = (span as any) as ReadableSpan;

    exporter.export([readableSpan], (result) => {
      expect(result.code).toBe(ExportResultCode.SUCCESS);
      done();
    });
  });

  it('should call api.pushTraces', (done) => {
    const pushTracesSpy = jest.spyOn(faro.api, 'pushTraces');
    const exporter = new FaroTraceExporter({ api: faro.api });

    const tracer = provider.getTracer('test');
    const span = tracer.startSpan('test-span');
    span.end();

    const readableSpan = (span as any) as ReadableSpan;

    exporter.export([readableSpan], (result) => {
      expect(pushTracesSpy).toHaveBeenCalled();
      expect(result.code).toBe(ExportResultCode.SUCCESS);
      done();
    });
  });

  it('should return FAILED when exporter is shutdown', (done) => {
    const exporter = new FaroTraceExporter({ api: faro.api });

    exporter.shutdown();

    const tracer = provider.getTracer('test');
    const span = tracer.startSpan('test-span');
    span.end();

    const readableSpan = (span as any) as ReadableSpan;

    exporter.export([readableSpan], (result) => {
      expect(result.code).toBe(ExportResultCode.FAILED);
      done();
    });
  });

  it('should handle export errors gracefully', (done) => {
    jest.spyOn(faro.api, 'pushTraces').mockImplementation(() => {
      throw new Error('Export failed');
    });
    const exporter = new FaroTraceExporter({ api: faro.api });

    const tracer = provider.getTracer('test');
    const span = tracer.startSpan('test-span');
    span.end();

    const readableSpan = (span as any) as ReadableSpan;

    exporter.export([readableSpan], (result) => {
      expect(result.code).toBe(ExportResultCode.FAILED);
      done();
    });
  });

  it('should resolve shutdown promise', async () => {
    const exporter = new FaroTraceExporter({ api: faro.api });

    await expect(exporter.shutdown()).resolves.toBeUndefined();
  });

  it('should resolve forceFlush promise', async () => {
    const exporter = new FaroTraceExporter({ api: faro.api });

    await expect(exporter.forceFlush()).resolves.toBeUndefined();
  });
});
