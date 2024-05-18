import type { Instrumentation } from '@grafana/faro-core';

import {
  ConsoleInstrumentation,
  ErrorsInstrumentation,
  PerformanceInstrumentation,
  SessionInstrumentation,
  ViewInstrumentation,
  WebVitalsInstrumentation,
  WebVitalsWithAttributionInstrumentation,
} from '../instrumentations';

import type { GetWebInstrumentationsOptions } from './types';

export function getWebInstrumentations(options: GetWebInstrumentationsOptions = {}): Instrumentation[] {
  const instrumentations: Instrumentation[] = [
    new ErrorsInstrumentation(),
    new SessionInstrumentation(),
    new ViewInstrumentation(),
  ];

  if (options.enablePerformanceInstrumentation !== false) {
    // unshift to ensure that initialization starts before the other instrumentations
    instrumentations.unshift(new PerformanceInstrumentation());
  }

  if (options.captureConsole !== false) {
    instrumentations.push(
      new ConsoleInstrumentation({
        disabledLevels: options.captureConsoleDisabledLevels,
      })
    );
  }

  if (options.captureWebVitalsAttribution === true) {
    instrumentations.push(new WebVitalsWithAttributionInstrumentation());
  } else {
    instrumentations.push(new WebVitalsInstrumentation());
  }

  return instrumentations;
}
