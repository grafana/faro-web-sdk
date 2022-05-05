import * as init from '../initialize';
import type { Agent } from '../types';
import type { Instrumentation } from './types';

export abstract class BaseInstrumentation implements Instrumentation {
  get agent(): Agent {
    return init.agent;
  }

  abstract readonly name: string;
  abstract readonly version: string;

  abstract initialize(): void;
}
