import { initializeConfig, UserConfig } from './config';
import { initializeMeta } from './meta';
import { initializePlugins } from './plugins';
import { initializeWindowObject } from './windowObject';

export function initialize(userConfig: UserConfig): void {
  initializeConfig(userConfig);

  initializeMeta();

  initializePlugins();

  initializeWindowObject();
}
