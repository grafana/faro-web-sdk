import type { Config } from '@grafana/faro-core';

export type ExtensionContext = 'background' | 'content-script' | 'popup';

export interface ChromeExtensionConfig extends Partial<Omit<Config, 'app' | 'parseStacktrace'>>, Pick<Config, 'app'> {
  url?: string;
  apiKey?: string;
  extensionContext?: ExtensionContext;
}
