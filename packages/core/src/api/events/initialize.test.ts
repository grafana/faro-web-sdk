import { initializeMetas } from '../../metas';
import { mockConfig, mockInternalLogger, MockTransport } from '../../testUtils';
import { initializeTransports } from '../../transports';
import { initializeTracesAPI } from '../traces';
import { initializeEventsAPI } from './initialize';
import type { EventsAPI } from './types';

describe('api.events', () => {
  function createAPI({ dedupe }: { dedupe: boolean } = { dedupe: true }): [EventsAPI, MockTransport] {
    const transport = new MockTransport();
    const config = mockConfig({
      dedupe,
      transports: [transport],
    });
    const transports = initializeTransports(mockInternalLogger, config);
    const metas = initializeMetas(mockInternalLogger, config);
    const tracesAPI = initializeTracesAPI(mockInternalLogger, config, transports, metas);
    const api = initializeEventsAPI(mockInternalLogger, config, transports, metas, tracesAPI);

    return [api, transport];
  }

  describe('pushEvent', () => {
    let api: EventsAPI;
    let transport: MockTransport;

    beforeEach(() => {
      [api, transport] = createAPI();
    });

    describe('Filtering', () => {
      it('filters the same event', () => {
        api.pushEvent('test', {
          a: '1',
        });
        expect(transport.items).toHaveLength(1);

        api.pushEvent('test', {
          a: '1',
        });
        expect(transport.items).toHaveLength(1);
      });

      it("doesn't filter events with same name and partially same values", () => {
        api.pushEvent('test', {
          a: '1',
        });
        expect(transport.items).toHaveLength(1);

        api.pushEvent('test', {
          a: '1',
          b: '2',
        });
        expect(transport.items).toHaveLength(2);
      });

      it("doesn't filter events with different name and same values", () => {
        api.pushEvent('test1', {
          a: '1',
        });
        expect(transport.items).toHaveLength(1);

        api.pushEvent('test2', {
          a: '1',
        });
        expect(transport.items).toHaveLength(2);
      });

      it("filters an event and doesn't filter the next different one", () => {
        api.pushEvent('test1', {
          a: '1',
        });
        expect(transport.items).toHaveLength(1);

        api.pushEvent('test1', {
          a: '1',
        });
        expect(transport.items).toHaveLength(1);

        api.pushEvent('test2', {
          b: '1',
        });
        expect(transport.items).toHaveLength(2);
      });

      it("doesn't filter when dedupe is false", () => {
        [api, transport] = createAPI({ dedupe: false });

        api.pushEvent('test');
        expect(transport.items).toHaveLength(1);

        api.pushEvent('test');
        expect(transport.items).toHaveLength(2);
      });

      it("doesn't filter when skipDedupe is true", () => {
        api.pushEvent('test');
        expect(transport.items).toHaveLength(1);

        api.pushEvent('test', {}, undefined, { skipDedupe: true });
        expect(transport.items).toHaveLength(2);
      });
    });
  });
});
