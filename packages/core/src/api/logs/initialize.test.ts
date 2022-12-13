import { initializeMetas } from '../../metas';
import { mockConfig, mockInternalLogger, MockTransport } from '../../testUtils';
import { initializeTransports } from '../../transports';
import { LogLevel } from '../../utils';
import { initializeTracesAPI } from '../traces';
import { initializeLogsAPI } from './initialize';
import type { LogsAPI } from './types';

describe('api.logs', () => {
  function createAPI({ dedupe }: { dedupe: boolean } = { dedupe: true }): [LogsAPI, MockTransport] {
    const transport = new MockTransport();
    const config = mockConfig({
      dedupe,
      transports: [transport],
    });
    const transports = initializeTransports(mockInternalLogger, config);
    const metas = initializeMetas(mockInternalLogger, config);
    const tracesAPI = initializeTracesAPI(mockInternalLogger, config, transports, metas);
    const api = initializeLogsAPI(mockInternalLogger, config, transports, metas, tracesAPI);

    return [api, transport];
  }

  describe('pushLog', () => {
    let api: LogsAPI;
    let transport: MockTransport;

    beforeEach(() => {
      [api, transport] = createAPI();
    });

    describe('Filtering', () => {
      it('filters the same event', () => {
        api.pushLog(['test']);
        expect(transport.items).toHaveLength(1);

        api.pushLog(['test']);
        expect(transport.items).toHaveLength(1);
      });

      it("doesn't filter events with partially same message", () => {
        api.pushLog(['test', 'another test']);
        expect(transport.items).toHaveLength(1);

        api.pushLog(['test']);
        expect(transport.items).toHaveLength(2);
      });

      it("doesn't filter events with same message and different level", () => {
        api.pushLog(['test']);
        expect(transport.items).toHaveLength(1);

        api.pushLog(['test'], {
          level: LogLevel.INFO,
        });
        expect(transport.items).toHaveLength(2);
      });

      it("doesn't filter events with same message and same level but different context", () => {
        api.pushLog(['test']);
        expect(transport.items).toHaveLength(1);

        api.pushLog(['test'], {
          context: {
            a: 1,
          },
        });
        expect(transport.items).toHaveLength(2);
      });

      it("filters an event and doesn't filter the next different one", () => {
        api.pushLog(['test']);
        expect(transport.items).toHaveLength(1);

        api.pushLog(['test']);
        expect(transport.items).toHaveLength(1);

        api.pushLog(['test'], {
          level: LogLevel.ERROR,
        });
        expect(transport.items).toHaveLength(2);
      });

      it("doesn't filter when dedupe is false", () => {
        [api, transport] = createAPI({ dedupe: false });

        api.pushLog(['test']);
        expect(transport.items).toHaveLength(1);

        api.pushLog(['test']);
        expect(transport.items).toHaveLength(2);
      });

      it("doesn't filter when skipDedupe is true", () => {
        api.pushLog(['test']);
        expect(transport.items).toHaveLength(1);

        api.pushLog(['test'], { skipDedupe: true });
        expect(transport.items).toHaveLength(2);
      });
    });
  });
});
