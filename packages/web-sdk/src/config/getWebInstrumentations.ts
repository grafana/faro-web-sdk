import type { Instrumentation } from '@grafana/faro-core';

import {
  ConsoleInstrumentation,
  ErrorsInstrumentation,
  SessionInstrumentation,
  ViewInstrumentation,
  WebVitalsInstrumentation,
} from '../instrumentations';
import { PerformanceInstrumentation } from '../instrumentations/performance';

import type { GetWebInstrumentationsOptions } from './types';

export function getWebInstrumentations(options: GetWebInstrumentationsOptions = {}): Instrumentation[] {
  const instrumentations: Instrumentation[] = [
    new ErrorsInstrumentation(),
    new WebVitalsInstrumentation(),
    new SessionInstrumentation(),
    new ViewInstrumentation(),
    new PerformanceInstrumentation(),
  ];

  if (options.captureConsole !== false) {
    instrumentations.push(
      new ConsoleInstrumentation({
        disabledLevels: options.captureConsoleDisabledLevels,
      })
    );
  }

  return instrumentations;
}
