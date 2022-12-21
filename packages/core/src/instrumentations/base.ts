import type { API } from '../api';
import type { Transports } from '../transports';
import { BaseExtension } from '../utils';
import type { Instrumentation } from './types';

export abstract class BaseInstrumentation extends BaseExtension implements Instrumentation {
  api: API = {} as API;
  transports: Transports = {} as Transports;

  abstract initialize(): void;
}
