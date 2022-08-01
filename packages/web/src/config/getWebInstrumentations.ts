import type { Instrumentation } from '@grafana/agent-core';

import { ConsoleInstrumentation, ErrorsInstrumentation, WebVitalsInstrumentation } from '../instrumentations';
import type { GetWebInstrumentationsOptions } from './types';

export function getWebInstrumentations(options: GetWebInstrumentationsOptions = {}): Instrumentation[] {
  const instrumentations: Instrumentation[] = [new ErrorsInstrumentation(), new WebVitalsInstrumentation()];

  if (options.captureConsole !== false) {
    instrumentations.push(new ConsoleInstrumentation());
  }

  return instrumentations;
}
