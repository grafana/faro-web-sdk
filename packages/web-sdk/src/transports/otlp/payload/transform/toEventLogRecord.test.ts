import { EventEvent, TransportItem, TransportItemType } from '@grafana/faro-core';
import { mockInternalLogger } from '@grafana/faro-core/src/testUtils';

import { initLogsTransform } from './transform';

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

const matchEventLogRecord = {
  timeUnixNano: 1674813181035000000,

  attributes: [
    {
      key: 'view.name',
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
      key: 'page.id',
      value: {
        stringValue: 'page-id',
      },
    },
    {
      key: 'page.attributes',
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
      key: 'session.id',
      value: { stringValue: 'session-abcd1234' },
    },
    {
      key: 'session.attributes',
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
      key: 'enduser.name',
      value: { stringValue: 'user-joe' },
    },
    {
      key: 'enduser.email',
      value: { stringValue: 'user@example.com' },
    },
    {
      key: 'enduser.attributes',
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
      key: 'event.attributes',
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

describe('toEventLogRecord', () => {
  it('Builds resource payload object for given transport item.', () => {
    const eventLogRecord = initLogsTransform(mockInternalLogger).toScopeLog(item).logRecords[0];
    expect(eventLogRecord).toMatchObject(matchEventLogRecord);
  });
});
