import { defaultLogArgsSerializer, isFunction } from '@grafana/faro-core';
import type { LogArgsSerializer } from '@grafana/faro-core';

import { userActionDataAttribute } from '../instrumentations/userActions';

import { makeCoreConfig } from './makeCoreConfig';

describe('defaultMetas', () => {
  it('includes K6Meta in defaultMetas for k6 (lab) sessions configured K6 properties.', () => {
    (global as any).k6 = {
      testRunId: 'abcde',
    };

    const browserConfig = {
      url: 'http://example.com/my-collector',
      app: {},
    };
    const config = makeCoreConfig(browserConfig);

    expect(config).toBeTruthy();
    expect(config?.metas).toHaveLength(3);
    expect(config?.metas.map((item) => (isFunction(item) ? item() : item))).toContainEqual({
      k6: {
        isK6Browser: true,
        testRunId: 'abcde',
      },
    });

    delete (global as any).k6;
  });

  it('does not include K6Meta in defaultMetas for non-k6 (field) sessions', () => {
    (global as any).k6 = {};

    const browserConfig = {
      url: 'http://example.com/my-collector',
      app: {},
    };
    const config = makeCoreConfig(browserConfig);

    expect(config).toBeTruthy();
    expect(config?.metas).toHaveLength(3);
    expect(config?.metas.map((item) => (isFunction(item) ? item() : item))).toContainEqual({
      k6: { isK6Browser: true },
    });

    delete (global as any).k6;
  });
});

describe('config', () => {
  it('includes custom logArgsSerializer if one was provided', () => {
    const customLogArgsSerializer: LogArgsSerializer = () => 'test';

    const browserConfig = {
      url: 'http://example.com/my-collector',
      app: {},
      logArgsSerializer: customLogArgsSerializer,
    };
    const config = makeCoreConfig(browserConfig);

    expect(config).toBeTruthy();
    expect(config?.logArgsSerializer).toBe(customLogArgsSerializer);
  });

  it('includes default logArgsSerializer if no custom one was provided', () => {
    const browserConfig = {
      url: 'http://example.com/my-collector',
      app: {},
    };
    const config = makeCoreConfig(browserConfig);

    expect(config).toBeTruthy();
    expect(config?.logArgsSerializer).toBe(defaultLogArgsSerializer);
  });

  it('adds default urls to ignoreUrls', () => {
    const browserConfig = {
      url: 'http://example.com/my-collector',
      app: {},
    };
    const config = makeCoreConfig(browserConfig);

    expect(config).toBeTruthy();
    expect(config?.ignoreUrls).toEqual([browserConfig.url, /\/collect(?:\/[\w]*)?$/]);
  });

  it('passes through web vitals configuration', () => {
    const browserConfig = {
      url: 'http://example.com/my-collector',
      app: {},
      webVitalsInstrumentation: {
        reportAllChanges: true,
      },
    };
    const config = makeCoreConfig(browserConfig);

    expect(config).toBeTruthy();
    expect(config?.webVitalsInstrumentation?.reportAllChanges).toBe(true);
  });

  it('merges configured urls with default URLs into ignoreUrls list', () => {
    const browserConfig = {
      url: 'http://example.com/my-collector',
      app: {},
      ignoreUrls: ['http://example.com/ignore-me'],
    };
    const config = makeCoreConfig(browserConfig);

    expect(config).toBeTruthy();
    expect(config?.ignoreUrls).toEqual([browserConfig.ignoreUrls[0], browserConfig.url, /\/collect(?:\/[\w]*)?$/]);
  });

  it.each(['http://example.com/collect', 'http://example.com/collect/874jdhalkfh7a9'])(
    'Matches default ignoreUrl with urls ending with /collect or ending with /collect followed by alphanumeric characters',
    (url) => {
      const config = makeCoreConfig({ url: '', app: {} });
      expect(config).toBeTruthy();
      // @ts-expect-error
      expect(config?.ignoreUrls[0]).toEqual(/\/collect(?:\/[\w]*)?$/);

      // @ts-expect-error
      expect(config.ignoreUrls[0].test(url)).toBe(true);
    }
  );

  it('updates the overrides object in the session config with the geoLocationTracking.enabled value', () => {
    const browserConfig = {
      url: 'http://example.com/my-collector',
      app: {},
      sessionTracking: {
        session: { id: 'my-session' },
      },
    };

    let config = makeCoreConfig({ ...browserConfig, trackGeolocation: true });
    expect(config?.sessionTracking?.session?.overrides).toHaveProperty('geoLocationTrackingEnabled');
    expect(config?.sessionTracking?.session?.overrides?.geoLocationTrackingEnabled).toBe(true);

    config = makeCoreConfig({ ...browserConfig, trackGeolocation: false });
    expect(config?.sessionTracking?.session?.overrides).toHaveProperty('geoLocationTrackingEnabled');
    expect(config?.sessionTracking?.session?.overrides?.geoLocationTrackingEnabled).toBe(false);

    // Also test that the session object is not created or mutated if geoLocationTracking is not enabled
    config = makeCoreConfig(browserConfig);
    expect(config?.sessionTracking?.session).toBeDefined();

    const sessionMeta = { id: 'test', attributes: { foo: 'bar' } };
    config = makeCoreConfig({
      ...browserConfig,
      sessionTracking: { session: sessionMeta },
    });

    expect(config?.sessionTracking?.session).toBeDefined();
    expect(config?.sessionTracking?.session?.overrides).toBeUndefined();
    expect(config?.sessionTracking?.session).toStrictEqual(sessionMeta);
  });

  it('trackUserActions settings defaults are applied', () => {
    const browserConfig = {
      url: 'http://example.com/my-collector',
      app: {},
    };
    const config = makeCoreConfig(browserConfig);

    expect(config).toBeTruthy();
    expect(config?.userActionsInstrumentation?.dataAttributeName).toBe(userActionDataAttribute);
  });

  it('trackUserActions setting are added to the config as provided by the user', () => {
    const browserConfig = {
      url: 'http://example.com/my-collector',
      app: {},
      userActionsInstrumentation: {
        dataAttributeName: 'data-test-action-name',
      },
    };
    const config = makeCoreConfig(browserConfig);

    expect(config).toBeTruthy();
    expect(config?.userActionsInstrumentation?.dataAttributeName).toBe('data-test-action-name');
  });

  it('experimental settings defaults are applied', () => {
    const browserConfig = {
      url: 'http://example.com/my-collector',
      app: {},
    };
    const config = makeCoreConfig(browserConfig);

    expect(config).toBeTruthy();
    expect(config?.experimental?.trackNavigation).toBe(false);
  });

  it('experimental.trackNavigation setting is added to the config as provided by the user', () => {
    const browserConfig = {
      url: 'http://example.com/my-collector',
      app: {},
      experimental: {
        trackNavigation: true,
      },
    };
    const config = makeCoreConfig(browserConfig);

    expect(config).toBeTruthy();
    expect(config?.experimental?.trackNavigation).toBe(true);
  });

  it('filters out navigation instrumentation when experimental.trackNavigation is false', () => {
    const browserConfig = {
      url: 'http://example.com/my-collector',
      app: {},
      experimental: {
        trackNavigation: false,
      },
    };
    const config = makeCoreConfig(browserConfig);

    expect(config).toBeTruthy();
    const navigationInstrumentation = config?.instrumentations?.find(
      (instr) => instr.name === '@grafana/faro-web-sdk:instrumentation-navigation'
    );
    expect(navigationInstrumentation).toBeUndefined();
  });

  it('includes navigation instrumentation when experimental.trackNavigation is true', () => {
    const browserConfig = {
      url: 'http://example.com/my-collector',
      app: {},
      experimental: {
        trackNavigation: true,
      },
    };
    const config = makeCoreConfig(browserConfig);

    expect(config).toBeTruthy();
    const navigationInstrumentation = config?.instrumentations?.find(
      (instr) => instr.name === '@grafana/faro-web-sdk:instrumentation-navigation'
    );
    expect(navigationInstrumentation).toBeDefined();
  });

  it('filters out navigation instrumentation by default when experimental is not provided', () => {
    const browserConfig = {
      url: 'http://example.com/my-collector',
      app: {},
    };
    const config = makeCoreConfig(browserConfig);

    expect(config).toBeTruthy();
    const navigationInstrumentation = config?.instrumentations?.find(
      (instr) => instr.name === '@grafana/faro-web-sdk:instrumentation-navigation'
    );
    expect(navigationInstrumentation).toBeUndefined();
  });
});
