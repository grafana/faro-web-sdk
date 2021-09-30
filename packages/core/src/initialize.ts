import { config, initializeConfig } from './config';
import { logger } from './logger';
import { UserConfig } from './types';

export function initialize(userConfig: UserConfig) {
  initializeConfig(userConfig);

  initializePlugins();

  defineAgentOnWindow();
}

export function initializePlugins() {
  config.plugins.forEach((plugin) => {
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
