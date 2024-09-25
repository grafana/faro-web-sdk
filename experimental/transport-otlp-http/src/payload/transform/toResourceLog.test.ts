import { LogEvent, LogLevel, TransportItem, TransportItemType } from '@grafana/faro-core';
import { mockInternalLogger } from '@grafana/faro-core/src/testUtils';

import { getLogTransforms } from './transform';

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
      brands: [
        { brand: 'Google Chrome', version: '111' },
        { brand: 'Not(A:Brand', version: '8' },
        { brand: 'Chromium', version: '111' },
      ],
      viewportHeight: '1080',
      viewportWidth: '1920',
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

const matchResourcePayload = {
  attributes: [
    {
      key: 'browser.mobile',
      value: { boolValue: false },
    },

    {
      key: 'user_agent.original',
      value: { stringValue: 'browser-ua-string' },
    },
    {
      key: 'browser.language',
      value: { stringValue: 'browser-language' },
    },
    {
      key: 'browser.brands',
      value: {
        arrayValue: {
          values: [
            {
              kvlistValue: {
                values: [
                  {
                    key: 'brand',
                    value: {
                      stringValue: 'Google Chrome',
                    },
                  },
                  {
                    key: 'version',
                    value: {
                      stringValue: '111',
                    },
                  },
                ],
              },
            },
            {
              kvlistValue: {
                values: [
                  {
                    key: 'brand',
                    value: {
                      stringValue: 'Not(A:Brand',
                    },
                  },
                  {
                    key: 'version',
                    value: {
                      stringValue: '8',
                    },
                  },
                ],
              },
            },
            {
              kvlistValue: {
                values: [
                  {
                    key: 'brand',
                    value: {
                      stringValue: 'Chromium',
                    },
                  },
                  {
                    key: 'version',
                    value: {
                      stringValue: '111',
                    },
                  },
                ],
              },
            },
          ],
        },
      },
    },
    {
      key: 'browser.platform',
      value: { stringValue: 'browser-operating-system' },
    },
    {
      key: 'browser.name',
      value: { stringValue: 'browser-name' },
    },
    {
      key: 'browser.version',
      value: { stringValue: 'browser-v109.0' },
    },
    {
      key: 'browser.screen_width',
      value: {
        stringValue: '1920',
      },
    },
    {
      key: 'browser.screen_height',
      value: {
        stringValue: '1080',
      },
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
      key: 'deployment.environment.name',
      value: { stringValue: 'app-production' },
    },
  ],
} as const;

describe('toResourceLog()', () => {
  const { toResourceLog } = getLogTransforms(mockInternalLogger);

  it('Builds a valid ResourceLogs structure', () => {
    const resourceLog = toResourceLog(item);

    expect(resourceLog).toBeTruthy();
    expect(resourceLog.resource).toBeTruthy();
    expect(resourceLog.scopeLogs).toBeTruthy();
    expect(Array.isArray(resourceLog.scopeLogs)).toBe(true);
  });

  it('Builds resource payload object for given transport item.', () => {
    const { resource } = toResourceLog(item);
    expect(resource).toMatchObject(matchResourcePayload);
  });

  it('Does not add an attribute if the respective Meta property is empty.', () => {
    const { resource: resourceEmptyAttributes } = toResourceLog({
      type: item.type,
      payload: item.payload,
      meta: {},
    });

    expect(resourceEmptyAttributes).toMatchObject({
      attributes: [],
    });
  });

  it('Does not add sdk language value to resource if meta skd is available.', () => {
    const resourceNoSdkMeta = toResourceLog({
      type: item.type,
      payload: item.payload,
      meta: {
        browser: item.meta.browser,
      },
    });
    expect(resourceNoSdkMeta.resource.attributes.some(({ key }) => key === 'telemetry.sdk.language')).toBe(false);
  });

  it('Adds a ScopeLog.', () => {
    const scopeLog = toResourceLog(item).scopeLogs[0];
    expect(scopeLog).toBeTruthy();
  });
});
