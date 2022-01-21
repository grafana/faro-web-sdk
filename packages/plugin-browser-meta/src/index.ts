import type { Plugin } from '@grafana/javascript-agent-core';
import { UAParser } from 'ua-parser-js';

const unknown = 'unknown';

const plugin: Plugin = {
  name: '@grafana/javascript-agent-plugin-browser-meta',
  metas: () => {
    const parser = new UAParser();
    const { name, version } = parser.getBrowser();
    const { name: osName, version: osVersion } = parser.getOS();
    const mobile = navigator.userAgent.includes('Mobi');

    return {
      browser: () => ({
        name: name ?? unknown,
        version: version ?? unknown,
        os: `${osName ?? unknown} ${osVersion ?? unknown}`,
        mobile,
      }),
    };
  },
};

export default plugin;
