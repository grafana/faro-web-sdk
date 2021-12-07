import type { Agent } from './agent';
import type { MetaMapLike } from './meta';
import type { Transport } from './transports';

export interface Plugin {
  name: string;

  instrumentations?: (agent: Agent) => void;
  metas?: (agent: Agent) => MetaMapLike;
  transports?: (agent: Agent) => Transport[];
}

export function initializePlugins(agent: Agent): void {
  agent.config.plugins
    .filter((plugin) => !!plugin.transports)
    .forEach((plugin) => {
      const transports = plugin.transports?.(agent) ?? [];

      agent.transports.add(...transports);
    });

  agent.config.plugins
    .filter((plugin) => !!plugin.metas)
    .forEach((plugin) => {
      const metas = plugin.metas?.(agent) ?? {};

      Object.entries(metas).forEach(([key, getter]) => agent.meta.add(key, getter));
    });

  agent.config.plugins.forEach((plugin) => {
    plugin.instrumentations?.(agent);
  });
}
