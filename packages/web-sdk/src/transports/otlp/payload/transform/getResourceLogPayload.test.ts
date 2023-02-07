import { LogEvent, LogLevel, TransportItem, TransportItemType } from '@grafana/faro-core';

import { getResourceLogPayload } from './transform';

const item: Readonly<TransportItem<LogEvent>> = {
  type: TransportItemType.LOG,
  payload: {
    context: {},
    level: LogLevel.INFO,
    message: 'just a log message',
    timestamp: new Date().toISOString(),
  },
  meta: {
    browser: {
      name: 'browser-name',
      version: 'browser-v109.0',
      os: 'browser-operating-system',
      mobile: false,
      userAgent: 'browser-ua-string',
      language: 'browser-language',
    },
    sdk: {
      name: 'integration-web-sdk-name',
      version: 'integration-v1.2.3',
      integrations: [
        {
          name: 'integration-attribute-one',
          version: 'one',
        },
        {
          name: 'integration-attribute-two',
          version: 'two',
        },
      ],
    },
    app: {
      name: 'app-cool-app',
      release: 'app-v1.23',
      version: 'app-v2.0.0',
      environment: 'app-production',
    },
  },
};

const resourcePayload = {
  attributes: [
    {
      key: 'browser.mobile',
      value: { boolValue: false },
    },

    {
      key: 'browser.user_agent',
      value: { stringValue: 'browser-ua-string' },
    },
    {
      key: 'browser.language',
      value: { stringValue: 'browser-language' },
    },
    {
      key: 'grafana.browser.os',
      value: { stringValue: 'browser-operating-system' },
    },
    // {
    //   key: 'browser.platform',
    //   value: { stringValue: 'browser-MyOperationSystem' },
    // },
    {
      key: 'grafana.browser.name',
      value: { stringValue: 'browser-name' },
    },
    {
      key: 'grafana.browser.version',
      value: { stringValue: 'browser-v109.0' },
    },
    {
      key: 'telemetry.sdk.name',
      value: { stringValue: 'integration-web-sdk-name' },
    },
    {
      key: 'telemetry.sdk.version',
      value: { stringValue: 'integration-v1.2.3' },
    },
    // Not decided yet if we add language attribute
    {
      key: 'telemetry.sdk.language',
      value: { stringValue: 'webjs' },
    },
    {
      key: 'service.name',
      value: { stringValue: 'app-cool-app' },
    },
    {
      key: 'service.version',
      value: { stringValue: 'app-v2.0.0' },
    },
    {
      key: 'deployment.environment',
      value: { stringValue: 'app-production' },
    },
  ],
} as const;

describe('getResourceLogPayload()', () => {
  it('Builds a valid ResourceLogPayload structure', () => {
    const resourceLogPayload = getResourceLogPayload(item);
    expect(resourceLogPayload).toBeTruthy();
    expect(resourceLogPayload.resource).toBeTruthy();
    expect(resourceLogPayload.scopeLogs).toBeTruthy();
    expect(Array.isArray(resourceLogPayload.scopeLogs)).toBe(true);
  });

  it('Builds resource payload object for given transport item.', () => {
    const { resource } = getResourceLogPayload(item);
    expect(resource).toMatchObject(resourcePayload);
  });

  it('Does not add an attribute if the respective Meta property is empty.', () => {
    const { resource: resourceEmptyAttributes } = getResourceLogPayload({
      type: item.type,
      payload: item.payload,
      meta: {},
    });

    expect(resourceEmptyAttributes).toMatchObject({
      attributes: [],
    });
  });

  it('Does not add sdk language value to resource if meta skd is available.', () => {
    const resourceNoSdkMeta = getResourceLogPayload({
      type: item.type,
      payload: item.payload,
      meta: {
        browser: item.meta.browser,
      },
    });
    expect(resourceNoSdkMeta.resource.attributes.some(({ key }) => key === 'telemetry.sdk.language')).toBe(false);
  });

  it('Adds a ScopeLog.', () => {
    const scopeLog = getResourceLogPayload(item).scopeLogs[0];
    expect(scopeLog).toBeTruthy();
  });
});
