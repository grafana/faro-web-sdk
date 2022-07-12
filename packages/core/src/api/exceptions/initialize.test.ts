import { initializeMetas } from '../../metas';
import { mockConfig, mockInternalLogger, MockTransport } from '../../testUtils';
import { initializeTransports, TransportItemType } from '../../transports';
import { initializeTracesAPI } from '../traces';
import { initializeExceptionsAPI } from './initialize';
import type { ExceptionEvent, ExceptionsAPI, ExceptionStackFrame } from './types';

describe('api.exceptions', () => {
  function createAPI(): [ExceptionsAPI, MockTransport] {
    const transport = new MockTransport();
    const config = mockConfig({
      transports: [transport],
    });
    const transports = initializeTransports(mockInternalLogger, config);
    const metas = initializeMetas(mockInternalLogger, config);
    const tracesAPI = initializeTracesAPI(mockInternalLogger, transports, metas);
    const api = initializeExceptionsAPI(mockInternalLogger, config, transports, metas, tracesAPI);

    return [api, transport];
  }

  describe('pushError', () => {
    it('error with overrides', () => {
      const [api, transport] = createAPI();
      const frames: ExceptionStackFrame[] = [
        {
          filename: 'foo.js',
          function: 'FooFn',
          colno: 4,
          lineno: 23,
        },
        {
          filename: 'bar.js',
          function: 'BarFn',
          colno: 6,
          lineno: 52,
        },
      ];
      api.pushError(new Error('test exception'), {
        stackFrames: frames,
        type: 'TestError',
      });
      expect(transport.items).toHaveLength(1);
      const payload = transport.items[0];
      expect(payload?.payload).toBeTruthy();
      expect(payload?.type).toEqual(TransportItemType.EXCEPTION);
      const event = payload?.payload as ExceptionEvent;
      expect(event.type).toEqual('TestError');
      expect(event.value).toEqual('test exception');
      expect(event.stacktrace).toEqual({ frames });
    });

    it('error without overrides', () => {
      const [api, transport] = createAPI();

      const err = new Error('test');
      api.pushError(err);
      expect(transport.items).toHaveLength(1);
      const payload = transport.items[0];
      expect(payload?.meta.app?.name).toEqual('test');
      expect(payload?.payload).toBeTruthy();
      expect(payload?.type).toEqual(TransportItemType.EXCEPTION);
      const event = payload?.payload as ExceptionEvent;
      expect(event.type).toEqual('Error');
      expect(event.value).toEqual('test');
      expect(event.timestamp).toBeTruthy();
      const stacktrace = event.stacktrace;
      expect(stacktrace).toBeTruthy();
      expect(stacktrace?.frames.length).toBeGreaterThan(3);
      expect(stacktrace?.frames[0]?.filename).toEqual('Error: test');
    });
  });
});

export {};
