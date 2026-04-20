import type { Meta, MetaItem } from '@grafana/faro-core';

import { getUAResult } from '../shared';

export const osMeta: MetaItem<Pick<Meta, 'os'>> = () => {
  const { name, version } = getUAResult().os;

  const os: NonNullable<Meta['os']> = {};

  if (name) {
    os.name = name;
  }

  if (version) {
    os.version = version;
  }

  return { os };
};
