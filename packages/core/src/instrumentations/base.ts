import type { API } from '../api';
import { BaseExtension } from '../utils';
import type { Instrumentation } from './types';

export abstract class BaseInstrumentation extends BaseExtension implements Instrumentation {
  api: API = {} as API;

  abstract initialize(): void;
}
