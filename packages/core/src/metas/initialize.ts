import type { Config } from '../config';
import type { InternalLogger } from '../internalLogger';
import { isFunction } from '../utils';
import { VERSION } from '../version';
import type { Meta, Metas, MetaItem } from './types';

export function initializeMetas(_internalLogger: InternalLogger, config: Config): Metas {
  let items: MetaItem[] = [];

  const add: Metas['add'] = (item) => {
    items.push(item);
  };

  const remove: Metas['remove'] = (item) => {
    items = items.filter((i) => i !== item);
  };

  const initial: Meta = {
    sdk: {
      name: '@grafana/agent-core',
      version: VERSION,
      integrations: config.instrumentations.map(({ name, version }) => ({ name, version })),
    },
  };

  if (config.app) {
    initial.app = config.app;
  }

  if (config.user) {
    initial.user = config.user;
  }

  if (config.session) {
    initial.session = config.session;
  }

  config.metas?.forEach(add);

  add(initial);

  return {
    add,
    remove,
    get value() {
      return items.reduce<Meta>((acc, item) => {
        Object.assign(acc, isFunction(item) ? item() : item);

        return acc;
      }, {});
    },
  };
}
