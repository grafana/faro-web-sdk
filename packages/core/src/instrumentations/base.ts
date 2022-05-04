import * as init from '../initialize';
import type { Agent } from '../types';
import type { Instrumentation } from './types';

export abstract class BaseInstrumentation implements Instrumentation {
  abstract initialize(): void;

  get agent(): Agent {
    return init.agent;
  }

  abstract name: string;
  abstract version: string;
}
