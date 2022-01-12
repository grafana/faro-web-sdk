import type { Commander } from './commander';
import type { Config } from './config';
import type { Meta } from './meta';
import type { Transports } from './transports';
import { globalObject } from './utils';

export interface Agent {
  config: Config;
  commander: Commander;
  meta: Meta;
  transports: Transports;
}

export let agent: Agent;

export function initializeAgent(config: Config, commander: Commander, meta: Meta, transports: Transports): Agent {
  agent = {
    config,
    commander,
    meta,
    transports,
  };

  if (!config.preventGlobalExposure) {
    Object.defineProperty(globalObject, config.globalObjectKey, {
      value: agent,
    });
  }

  return agent;
}
