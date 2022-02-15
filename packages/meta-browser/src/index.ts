import type { Meta } from '@grafana/javascript-agent-core';
import { UAParser } from 'ua-parser-js';

const browserMeta: Meta = () => {
  const parser = new UAParser();
  const { name, version } = parser.getBrowser();
  const { name: osName, version: osVersion } = parser.getOS();
  const mobile = navigator.userAgent.includes('Mobi');
  const unknown = 'unknown';

  return {
    browser: () => ({
      name: name ?? unknown,
      version: version ?? unknown,
      os: `${osName ?? unknown} ${osVersion ?? unknown}`,
      mobile,
    }),
  };
};

export default browserMeta;
