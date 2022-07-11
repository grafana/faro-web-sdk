import { BaseExtension } from '../utils';
import type { Instrumentation } from './types';

export abstract class BaseInstrumentation extends BaseExtension implements Instrumentation {
  abstract initialize(): void;
}
