import { agent } from '../agent';
import type { Agent } from '../agent';
import type { Instrumentation } from './types';

export abstract class BaseInstrumentation implements Instrumentation {
  abstract readonly name: string;
  abstract readonly version: string;

  get agent(): Agent {
    return agent;
  }

  abstract initialize(): void;
}
