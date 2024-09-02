import { LogEvent, LogLevel, TransportItem, TransportItemType } from '@grafana/faro-core';
import { mockInternalLogger } from '@grafana/faro-core/src/testUtils';

import { getLogTransforms } from './transform';

const item: TransportItem<LogEvent> = {
  type: TransportItemType.LOG,
  payload: {
    context: { foo: 'bar' },
    level: LogLevel.INFO,
    message: 'Faro was initialized',
    timestamp: '2023-01-27T09:53:01.035Z',
    trace: {
      trace_id: 'trace-id',
      span_id: 'span-id',
    },
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
    },
  },
} as const;

const matchLogLogRecord = {
  timeUnixNano: 1674813181035000000,
  severityNumber: 9, // static value
  severityText: 'INFO', // static value
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
      key: 'url.full',
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
      key: 'user.id',
      value: { stringValue: 'user-abc123' },
    },
    {
      key: 'user.name',
      value: { stringValue: 'user-joe' },
    },
    {
      key: 'user.email',
      value: { stringValue: 'user@example.com' },
    },
    {
      key: 'user.attributes',
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
      key: 'faro.log.context',
      value: {
        kvlistValue: {
          values: [
            {
              key: 'foo',
              value: {
                stringValue: 'bar',
              },
            },
          ],
        },
      },
    },
  ],
  traceId: 'trace-id',
  spanId: 'span-id',
} as const;

describe('toLogLogRecord', () => {
  it('Builds resource payload object for given transport item.', () => {
    const logLogRecord = getLogTransforms(mockInternalLogger).toScopeLog(item).logRecords[0];
    expect(logLogRecord).toEqual(matchLogLogRecord);
  });

  it.each([
    { level: LogLevel.TRACE, match: { severityNumber: 1, severityText: 'TRACE' } },
    { level: LogLevel.DEBUG, match: { severityNumber: 5, severityText: 'DEBUG' } },
    { level: LogLevel.INFO, match: { severityNumber: 9, severityText: 'INFO' } },
    { level: LogLevel.LOG, match: { severityNumber: 10, severityText: 'INFO2' } },
    { level: LogLevel.WARN, match: { severityNumber: 13, severityText: 'WARN' } },
    { level: LogLevel.ERROR, match: { severityNumber: 17, severityText: 'ERROR' } },
  ])('Maps to the correct otel log levels.', ({ level, match: { severityNumber, severityText } }) => {
    const logLogRecord = getLogTransforms(mockInternalLogger).toScopeLog({
      ...item,
      payload: { ...item.payload, level },
    }).logRecords[0];

    expect(logLogRecord?.severityNumber).toEqual(severityNumber);
    expect(logLogRecord?.severityText).toEqual(severityText);
  });
});
