import { config, initializeConfig, UserConfig } from './config';
import { initializeMeta } from './meta';
import { initializePlugins } from './plugins';
import { initializeWindowObject } from './windowObject';

export function initialize(userConfig: UserConfig) {
  initializeConfig(userConfig);

  initializeMeta();

  initializePlugins(config.plugins);

  initializeWindowObject();
}
