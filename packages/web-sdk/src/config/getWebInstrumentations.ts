import type { Instrumentation } from '@grafana/faro-core';

import {
  ConsoleInstrumentation,
  CSPInstrumentation,
  ErrorsInstrumentation,
  NavigationInstrumentation,
  PerformanceInstrumentation,
  SessionInstrumentation,
  UserActionInstrumentation,
  ViewInstrumentation,
  WebVitalsInstrumentation,
} from '../instrumentations';

import type { GetWebInstrumentationsOptions } from './types';

export function getWebInstrumentations(options: GetWebInstrumentationsOptions = {}): Instrumentation[] {
  const instrumentations: Instrumentation[] = [
    new UserActionInstrumentation(),
    new ErrorsInstrumentation(),
    new WebVitalsInstrumentation(),
    new SessionInstrumentation(),
    new ViewInstrumentation(),
    new NavigationInstrumentation(),
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

  return instrumentations;
}
