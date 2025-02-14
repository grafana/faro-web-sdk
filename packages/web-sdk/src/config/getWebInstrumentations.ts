import type { Instrumentation } from '@grafana/faro-core';

import {
  ConsoleInstrumentation,
  ErrorsInstrumentation,
  PerformanceInstrumentation,
  SessionInstrumentation,
  ViewInstrumentation,
  WebVitalsInstrumentation,
} from '../instrumentations';
import { TracingInstrumentation } from '../instrumentations/web-tracing';

import type { GetWebInstrumentationsOptions } from './types';

export function getWebInstrumentations(options: GetWebInstrumentationsOptions = {}): Instrumentation[] {
  const instrumentations: Instrumentation[] = [];

  if (options.enablePerformanceInstrumentation !== false) {
    //  ensure that initialization starts before the other instrumentations
    instrumentations.push(new PerformanceInstrumentation());
  }

  if (options.captureConsole !== false) {
    instrumentations.push(
      new ConsoleInstrumentation({
        disabledLevels: options.captureConsoleDisabledLevels,
      })
    );
  }

  instrumentations.push(
    new TracingInstrumentation(),
    new ErrorsInstrumentation(),
    new WebVitalsInstrumentation(),
    new SessionInstrumentation(),
    new ViewInstrumentation()
  );

  return instrumentations;
}
