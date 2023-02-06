import { ExceptionEvent, TransportItem, TransportItemType, VERSION as SDK_VERSION } from '@grafana/faro-core';

import { getScopeLog } from './transform';

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
  },
  meta: {} as const,
};

describe('getScopeLog', () => {
  it('Builds valid ScopeLog.', () => {
    const { scope, logRecords } = getScopeLog(item);
    expect(scope).toMatchObject({
      name: '@grafana/faro-web-sdk',
      version: SDK_VERSION,
    });
    expect(logRecords[0]).toBeTruthy();
  });
});
