import type { Instrumentation } from '@grafana/faro-core';

import {
  ConsoleInstrumentation,
  CSPInstrumentation,
  ErrorsInstrumentation,
  FrustrationInstrumentation,
  NavigationInstrumentation,
  PerformanceInstrumentation,
  SessionInstrumentation,
  UserActionInstrumentation,
  ViewInstrumentation,
  WebVitalsInstrumentation,
} from '../instrumentations';

import type { GetWebInstrumentationsOptions } from './types';

const navigationInstrumentationName = '@grafana/faro-web-sdk:instrumentation-navigation';

export function getWebInstrumentations(
  options: GetWebInstrumentationsOptions = {},
  customInstrumentations?: Instrumentation[]
): Instrumentation[] {
  const instrumentations: Instrumentation[] = customInstrumentations ?? [
    new UserActionInstrumentation(),
    new ErrorsInstrumentation(),
    new WebVitalsInstrumentation(),
    new SessionInstrumentation(),
    new ViewInstrumentation(),
    ...(options.trackNavigation === false ? [] : [new NavigationInstrumentation()]),
    new FrustrationInstrumentation(),
  ];

  if (customInstrumentations === undefined) {
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
  }

  if (options.trackNavigation === false) {
    return instrumentations.filter(({ name }) => name !== navigationInstrumentationName);
  }

  return instrumentations;
}
