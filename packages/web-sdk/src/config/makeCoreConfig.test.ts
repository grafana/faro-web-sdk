import { isFunction } from '@grafana/faro-core';

import { defaultMetas } from '../metas/const';

import { makeCoreConfig } from './makeCoreConfig';

describe('defaultMetas', () => {
  it('includes K6Meta in defaultMetas for k6 (lab) sessions', () => {
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
