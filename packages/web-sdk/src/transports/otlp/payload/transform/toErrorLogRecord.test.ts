import { ExceptionEvent, TransportItem, TransportItemType } from '@grafana/faro-core';
import { mockInternalLogger } from '@grafana/faro-core/src/testUtils';

import { initLogsTransform } from './transform';

const item: TransportItem<ExceptionEvent> = {
  type: TransportItemType.EXCEPTION,
  payload: {
    timestamp: '2023-01-27T09:53:01.035Z',
    type: 'Error',
    value: 'Error message',
    stacktrace: {
      frames: [
        {
          filename: 'filename-one',
          function: 'throwError',
          colno: 21,
          lineno: 11,
        },
        {
          filename: 'filename-two',
          function: 'HTMLUnknownElement.callCallback2',
          colno: 2345,
          lineno: 42,
        },
      ],
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

const matchErrorLogRecord = {
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
      key: 'exception.type',
      value: { stringValue: 'Error' },
    },
    {
      key: 'exception.message',
      value: { stringValue: 'Error message' },
    },
    // {
    //   key: 'exception.stacktrace',
    //   value: { stringValue: 'The unparsed stacktrace' },
    // },
    {
      key: 'faro.error.stacktrace',
      value: {
        kvlistValue: {
          values: [
            {
              key: 'frames',
              value: {
                arrayValue: {
                  values: [
                    {
                      kvlistValue: {
                        values: [
                          {
                            key: 'filename',
                            value: { stringValue: 'filename-one' },
                          },
                          {
                            key: 'function',
                            value: { stringValue: 'throwError' },
                          },
                          {
                            key: 'colno',
                            value: { intValue: 21 },
                          },
                          {
                            key: 'lineno',
                            value: { intValue: 11 },
                          },
                        ],
                      },
                    },
                    {
                      kvlistValue: {
                        values: [
                          {
                            key: 'filename',
                            value: { stringValue: 'filename-two' },
                          },
                          {
                            key: 'function',
                            value: { stringValue: 'HTMLUnknownElement.callCallback2' },
                          },
                          {
                            key: 'colno',
                            value: { intValue: 2345 },
                          },
                          {
                            key: 'lineno',
                            value: { intValue: 42 },
                          },
                        ],
                      },
                    },
                  ],
                },
              },
            },
          ],
        },
      },
    },
  ],
} as const;

describe('toErrorLogRecord', () => {
  it('Builds resource payload object for given transport item.', () => {
    const errorLogRecord = initLogsTransform(mockInternalLogger).toScopeLog(item).logRecords[0];
    expect(errorLogRecord).toMatchObject(matchErrorLogRecord);
  });
});
