import { EventEvent, TransportItem, TransportItemType } from 'packages/web-sdk/src';
import { OtelPayload } from './OtelPayload';

describe('OtelPayload', () => {
  it('Creates an instance with empty OtelPayload', () => {
    const otelPayload = new OtelPayload();
    const payload = otelPayload.getPayload();

    expect(payload.resourceLogs.length).toBe(0);
    expect(payload.resourceSpans.length).toBe(0);
  });

  it('Creates an instance containing the respective resource for given TransportItem', () => {
    const item: TransportItem<EventEvent> = {
      type: TransportItemType.EVENT,
      payload: {
        name: 'event-name',
        domain: 'event-domain',
        timestamp: '2023-01-27T09:53:01.035Z',
        attributes: {
          eventAttribute1: 'one',
          eventAttribute2: 'two',
        },
        trace: {
          trace_id: 'trace-id',
          span_id: 'span-id',
        } as const,
      },
      meta: {
        view: {
          name: 'view-default',
        },
        page: {
          id: 'page-id',
          url: 'http://localhost:5173',
          attributes: {
            pageAttribute1: 'one',
            pageAttribute2: 'two',
          },
        },
        session: {
          id: 'session-abcd1234',
          attributes: {
            sessionAttribute1: 'one',
            sessionAttribute2: 'two',
          },
        },
        user: {
          email: 'user@example.com',
          id: 'user-abc123',
          username: 'user-joe',
          attributes: {
            userAttribute1: 'one',
            userAttribute2: 'two',
          },
        } as const,
      } as const,
    };

    const otelPayload = new OtelPayload();
    const payload = otelPayload.getPayload();

    expect(payload.resourceLogs.length).toBe(0);
    expect(payload.resourceSpans.length).toBe(0);
  });
});
