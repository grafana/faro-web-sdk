import { isFunction } from '@grafana/faro-core';

import { defaultMetas } from '../metas/const';

import { makeCoreConfig } from './makeCoreConfig';
import type { BrowserConfig } from './types';

describe('defaultMetas', () => {
  it('includes K6Meta in defaultMetas for k6 (lab) sessions', () => {
    (global as any).k6 = {};

    const config = makeCoreConfig({} as BrowserConfig)!;

    expect(config.metas).toHaveLength(2);
    expect(config.metas.map((item) => (isFunction(item) ? item() : item))).toContainEqual({
      k6: { isK6Browser: false },
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
