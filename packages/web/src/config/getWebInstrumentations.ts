import type { Instrumentation } from '@grafana/agent-core';

import {
  ConsoleInstrumentation,
  ErrorsInstrumentation,
  WebVitalsInstrumentation,
  SessionInstrumentation,
} from '../instrumentations';
import type { GetWebInstrumentationsOptions } from './types';

export function getWebInstrumentations(options: GetWebInstrumentationsOptions = {}): Instrumentation[] {
  const instrumentations: Instrumentation[] = [
    new ErrorsInstrumentation(),
    new WebVitalsInstrumentation(),
    new SessionInstrumentation(),
  ];

  if (options.captureConsole !== false) {
    instrumentations.push(new ConsoleInstrumentation());
  }

  return instrumentations;
}
