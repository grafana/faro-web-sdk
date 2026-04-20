import { UAParser } from 'ua-parser-js';

import type { Meta, MetaItem } from '@grafana/faro-core';

export const osMeta: MetaItem<Pick<Meta, 'os'>> = () => {
  const parser = new UAParser();
  const { name, version } = parser.getOS();

  const os: NonNullable<Meta['os']> = {};

  if (name) {
    os.name = name;
  }

  if (version) {
    os.version = version;
  }

  return { os };
};
