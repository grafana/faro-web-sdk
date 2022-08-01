import type { Meta, MetaItem } from '@grafana/agent-core';
import { UAParser } from 'ua-parser-js';

export const browserMeta: MetaItem<Pick<Meta, 'browser'>> = () => {
  const parser = new UAParser();
  const { name, version } = parser.getBrowser();
  const { name: osName, version: osVersion } = parser.getOS();
  const mobile = navigator.userAgent.includes('Mobi');
  const unknown = 'unknown';

  return {
    browser: {
      name: name ?? unknown,
      version: version ?? unknown,
      os: `${osName ?? unknown} ${osVersion ?? unknown}`,
      mobile,
    },
  };
};
