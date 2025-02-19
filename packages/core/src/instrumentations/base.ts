import type { API } from '../api';
import type { Config } from '../config';
import { BaseExtension } from '../extensions';
import type { Transports } from '../transports';

import type { Instrumentation } from './types';

export abstract class BaseInstrumentation<T extends Config = Config>
  extends BaseExtension<T>
  implements Instrumentation<T>
{
  api: API = {} as API;
  transports: Transports = {} as Transports;

  abstract initialize(): void;
}
