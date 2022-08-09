import type { Config } from '../config';
import type { InternalLogger } from '../internalLogger';
import { isFunction } from '../utils';
import { VERSION } from '../version';
import type { Meta, Metas, MetaItem } from './types';

export function initializeMetas(internalLogger: InternalLogger, config: Config): Metas {
  let items: MetaItem[] = [];

  const add: Metas['add'] = (...newItems) => {
    internalLogger.debug('Adding metas\n', newItems);
    items.push(...newItems);
  };

  const remove: Metas['remove'] = (...itemsToRemove) => {
    internalLogger.debug('Removing metas\n', itemsToRemove);
    items = items.filter((currentItem) => !itemsToRemove.includes(currentItem));
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

  add(initial, ...(config.metas ?? []));

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
