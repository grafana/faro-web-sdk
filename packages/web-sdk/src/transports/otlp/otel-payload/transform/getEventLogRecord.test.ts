import { EventEvent, TransportItem, TransportItemType } from '@grafana/faro-core';
import { getScopeLog } from './transform';

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

const errorLogRecordPayload = {
  timeUnixNano: 1674813181035000000,

  attributes: [
    {
      key: 'grafana.view.name',
      value: {
        stringValue: 'view-default',
      },
    },
    {
      key: 'http.url',
      value: {
        stringValue: 'http://localhost:5173',
      },
    },
    {
      key: 'grafana.page.id',
      value: {
        stringValue: 'page-id',
      },
    },
    {
      key: 'grafana.page.attributes',
      value: {
        kvlistValue: {
          values: [
            {
              key: 'pageAttribute1',
              value: {
                stringValue: 'one',
              },
            },
            {
              key: 'pageAttribute2',
              value: {
                stringValue: 'two',
              },
            },
          ],
        },
      },
    },
    {
      key: 'grafana.session.id',
      value: { stringValue: 'session-abcd1234' },
    },
    {
      key: 'grafana.session.attributes',
      value: {
        kvlistValue: {
          values: [
            {
              key: 'sessionAttribute1',
              value: {
                stringValue: 'one',
              },
            },
            {
              key: 'sessionAttribute2',
              value: {
                stringValue: 'two',
              },
            },
          ],
        },
      },
    },
    {
      key: 'enduser.id',
      value: { stringValue: 'user-abc123' },
    },
    {
      key: 'grafana.enduser.name',
      value: { stringValue: 'user-joe' },
    },
    {
      key: 'grafana.enduser.email',
      value: { stringValue: 'user@example.com' },
    },
    {
      key: 'grafana.enduser.attributes',
      value: {
        kvlistValue: {
          values: [
            {
              key: 'userAttribute1',
              value: {
                stringValue: 'one',
              },
            },
            {
              key: 'userAttribute2',
              value: {
                stringValue: 'two',
              },
            },
          ],
        },
      },
    },
    {
      key: 'event.name',
      value: { stringValue: 'event-name' },
    },
    {
      key: 'event.domain',
      value: { stringValue: 'event-domain' },
    },
    {
      key: 'grafana.event.attributes',
      value: {
        kvlistValue: {
          values: [
            {
              key: 'eventAttribute1',
              value: {
                stringValue: 'one',
              },
            },
            {
              key: 'eventAttribute2',
              value: {
                stringValue: 'two',
              },
            },
          ],
        },
      },
    },
  ],
} as const;

describe('getErrorLogRecord', () => {
  it('Builds resource payload object for given transport item.', () => {
    const logLogRecord = getScopeLog(item).logRecords[0];
    expect(logLogRecord).toMatchObject(errorLogRecordPayload);
  });
});
