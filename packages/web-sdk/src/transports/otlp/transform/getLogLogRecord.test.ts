import { LogEvent, LogLevel, TransportItem, TransportItemType } from '@grafana/faro-core';
import { getScopeLog } from './transfomers';

const item: TransportItem<LogEvent> = {
  type: TransportItemType.LOG,
  payload: {
    context: {},
    level: LogLevel.INFO,
    message: 'Faro was initialized',
    timestamp: '2023-01-27T09:53:01.035Z',
  },
  meta: {
    view: {
      name: 'view-default',
    },
    page: {
      // id: '',
      url: 'http://localhost:5173',
      attributes: {
        pageAttribute1: 'page-attribute-one',
        pageAttribute2: 'page-attribute-two',
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
    },
  },
} as const;

const logLogRecordPayload = {
  timeUnixNano: 1674813181035000000,
  observedTimeUnixNano: 1674813181035000000,
  severityNumber: 10,
  severityText: 'INFO2',
  body: {
    stringValue: 'Faro was initialized',
  },
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
      key: 'session.id',
      value: { stringValue: 'session-abcd1234' },
    },
    {
      key: 'session.attributes',
      value: {
        kvListValue: {
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
        kvListValue: {
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
  ],
  droppedAttributesCount: 0,
} as const;

describe('getLogLogRecord', () => {
  it('Builds resource payload object for given transport item.', () => {
    const logLogRecord = getScopeLog(item).logRecords[0];
    expect(logLogRecord).toMatchObject(logLogRecordPayload);
  });
});
