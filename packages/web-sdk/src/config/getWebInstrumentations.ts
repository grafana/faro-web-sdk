import type { Instrumentation } from '@grafana/faro-core';

import {
  ConsoleInstrumentation,
  CSPInstrumentation,
  ErrorsInstrumentation,
  PerformanceInstrumentation,
  SessionInstrumentation,
  UserActionInstrumentation,
  ViewInstrumentation,
  WebVitalsInstrumentation,
} from '../instrumentations';
import { UserEventsInstrumentation } from '../instrumentations/userEvents/instrumentation';

import type { GetWebInstrumentationsOptions } from './types';

export function getWebInstrumentations(options: GetWebInstrumentationsOptions = {}): Instrumentation[] {
  const instrumentations: Instrumentation[] = [
    new UserActionInstrumentation(),
    new ErrorsInstrumentation(),
    new WebVitalsInstrumentation(),
    new SessionInstrumentation(),
    new ViewInstrumentation(),
  ];

  if (options.enablePerformanceInstrumentation !== false) {
    // unshift to ensure that initialization starts before the other instrumentations
    instrumentations.unshift(new PerformanceInstrumentation());
  }

  if (options.enableContentSecurityPolicyInstrumentation !== false) {
    instrumentations.push(new CSPInstrumentation());
  }

  if (options.captureConsole !== false) {
    instrumentations.push(new ConsoleInstrumentation());
  }

  if (options.enableUserEventsInstrumentation === true) {
    instrumentations.push(new UserEventsInstrumentation());
  }

  return instrumentations;
}
