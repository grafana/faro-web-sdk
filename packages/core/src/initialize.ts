import { config, initializeConfig } from './config';
import { logger } from './logger';
import { PluginTypes, UserConfig } from './types';

export function initialize(userConfig: UserConfig) {
  initializeConfig(userConfig);

  initializePlugins();

  defineAgentOnWindow();
}

export function initializePlugins() {
  config.plugins
    .sort((plugin1, plugin2) => {
      const isPlugin1Meta = plugin1.type === PluginTypes.META;
      const isPlugin2Meta = plugin2.type === PluginTypes.META;

      if (isPlugin1Meta && !isPlugin2Meta) {
        return -1;
      }

      if (isPlugin2Meta && !isPlugin1Meta) {
        return 1;
      }

      return 0;
    })
    .forEach((plugin) => {
      plugin.initialize();
    });
}

export function defineAgentOnWindow() {
  if (!config.preventWindowExposure) {
    Object.defineProperty(window, config.windowObjectKey, {
      configurable: false,
      enumerable: true,
      value: {
        config,
        logger,
      },
      writable: false,
    });
  }
}
