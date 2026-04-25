import type { Meta, MetaGetter, MetaOS } from '@grafana/faro-core';

import { getUAResult } from '../shared';

export const osMeta: MetaGetter<Pick<Meta, 'os'>> = () => {
  const { name, version } = getUAResult().os;

  if (!name && !version) {
    return {};
  }

  const os: MetaOS = {};

  if (name) {
    os.name = name;
  }

  if (version) {
    os.version = version;
  }

  return { os };
};
