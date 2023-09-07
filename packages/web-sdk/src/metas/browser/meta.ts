import { UAParser } from 'ua-parser-js';

import type { Meta, MetaBrowser, MetaItem } from '@grafana/faro-core';

export const browserMeta: MetaItem<Pick<Meta, 'browser'>> = () => {
  const parser = new UAParser();
  const { name, version } = parser.getBrowser();
  const { name: osName, version: osVersion } = parser.getOS();
  const userAgent = parser.getUA();
  const language = navigator.language;
  const mobile = navigator.userAgent.includes('Mobi');
  const brands = getBrands();
  const unknown = 'unknown';

  return {
    browser: {
      name: name ?? unknown,
      version: version ?? unknown,
      os: `${osName ?? unknown} ${osVersion ?? unknown}`,
      userAgent: userAgent ?? unknown,
      language: language ?? unknown,
      mobile,
      brands: brands ?? unknown,
    },
  };

  function getBrands(): MetaBrowser['brands'] | undefined {
    if (!name || !version) {
      return undefined;
    }

    if ('userAgentData' in navigator) {
      // userAgentData in experimental (only Chrome supports it) thus TS does not ship the respective type declarations
      return (navigator as any).userAgentData.brands;
    }

    return undefined;
  }
};
