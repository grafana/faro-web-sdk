import type { Meta, MetaItem } from '@grafana/faro-core';

export const extensionMeta: MetaItem<Pick<Meta, 'browser'>> = () => {
  const manifest = typeof chrome !== 'undefined' && chrome.runtime?.getManifest ? chrome.runtime.getManifest() : null;

  return {
    browser: {
      name: manifest?.name ?? 'unknown',
      version: manifest?.version ?? 'unknown',
      os: 'chrome-extension',
      userAgent: typeof navigator !== 'undefined' ? navigator.userAgent : 'unknown',
      language: typeof navigator !== 'undefined' ? navigator.language : 'unknown',
      mobile: false,
      brands: undefined as any,
      viewportWidth: typeof window !== 'undefined' ? `${window.innerWidth}` : '0',
      viewportHeight: typeof window !== 'undefined' ? `${window.innerHeight}` : '0',
    },
  };
};
