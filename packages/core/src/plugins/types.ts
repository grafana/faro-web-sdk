import type { MetaMapLike } from '../meta';
import type { Transport } from '../transports';
import type { Agent } from '../types';

export interface Plugin {
  name: string;

  instrumentations?: (agent: Agent) => void;
  metas?: (agent: Agent) => MetaMapLike;
  transports?: (agent: Agent) => Transport[];
}
