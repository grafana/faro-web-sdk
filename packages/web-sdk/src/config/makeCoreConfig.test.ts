import { defaultLogArgsSerializer, isFunction } from '@grafana/faro-core';
import type { LogArgsSerializer } from '@grafana/faro-core';

import { defaultMetas } from '../metas/const';

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

  it('does not include K6 Object properties if not set', () => {
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

  it('does not include K6Meta in defaultMetas for non-k6 (field) sessions', () => {
    expect(defaultMetas).toHaveLength(2);
    expect(defaultMetas.map((item) => (isFunction(item) ? item() : item))).not.toContainEqual({
      k6: { isK6Browser: true },
    });
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
    expect(config?.ignoreUrls).toEqual([/\/collect(?:\/[\w]*)?$/]);
  });

  it('merges configured urls with default URLs into ignoreUrls list', () => {
    const browserConfig = {
      url: 'http://example.com/my-collector',
      app: {},
      ignoreUrls: ['http://example.com/ignore-me'],
    };
    const config = makeCoreConfig(browserConfig);

    expect(config).toBeTruthy();
    expect(config?.ignoreUrls).toEqual([browserConfig.ignoreUrls[0], /\/collect(?:\/[\w]*)?$/]);
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
});
