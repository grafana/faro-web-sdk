import type { Config } from './config';
import type { Logger } from './logger';
import type { Meta } from './meta';
import type { Transports } from './transports';
import { globalObject } from './utils';

export interface Agent {
  config: Config;
  logger: Logger;
  meta: Meta;
  transports: Transports;
}

export let agent: Agent;

export function initializeAgent(config: Config, logger: Logger, meta: Meta, transports: Transports): Agent {
  agent = {
    config,
    logger,
    meta,
    transports,
  };

  if (!config.preventGlobalExposure) {
    Object.defineProperty(globalObject, config.globalObjectKey, agent);
  }

  return agent;
}
