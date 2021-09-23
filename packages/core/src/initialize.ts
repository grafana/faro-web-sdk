import { createAgent, setAgent } from './agent';
import { getConfigFromUserConfig, UserConfig } from './config';

export function initialize(userConfig: UserConfig) {
  const config = getConfigFromUserConfig(userConfig);

  const agent = createAgent(config);

  setAgent(agent);

  if (!config.preventWindowExposure) {
    Object.defineProperty(window, config.windowObject, {
      configurable: false,
      enumerable: true,
      value: agent,
      writable: false,
    });
  }

  return agent;
}
