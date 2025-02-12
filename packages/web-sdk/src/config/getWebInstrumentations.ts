import type { Instrumentation } from '@grafana/faro-core';

import {
  ConsoleInstrumentation,
  ErrorsInstrumentation,
  PerformanceInstrumentation,
  SessionInstrumentation,
  TracingInstrumentation,
  ViewInstrumentation,
  WebVitalsInstrumentation,
} from '../instrumentations';

import type { GetWebInstrumentationsOptions } from './types';

export function getWebInstrumentations(options: GetWebInstrumentationsOptions = {}): Instrumentation[] {
  const instrumentations: Instrumentation[] = [
    new ErrorsInstrumentation(),
    new WebVitalsInstrumentation(),
    new SessionInstrumentation(),
    new ViewInstrumentation(),
  ];

  if (options.enablePerformanceInstrumentation !== false) {
    // unshift to ensure that initialization starts before the other instrumentations
    instrumentations.unshift(new PerformanceInstrumentation());
  }

  if (options.enablePerformanceInstrumentation !== false) {
    // unshift to ensure that initialization starts before the other instrumentations
    instrumentations.push(new TracingInstrumentation());
  }

  if (options.captureConsole !== false) {
    instrumentations.push(
      new ConsoleInstrumentation({
        disabledLevels: options.captureConsoleDisabledLevels,
      })
    );
  }

  return instrumentations;
}
