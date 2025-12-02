import type { Instrumentation } from '@grafana/faro-core';

import { AppStateInstrumentation } from '../instrumentations/appState';
import { ConsoleInstrumentation } from '../instrumentations/console';
import { ErrorsInstrumentation } from '../instrumentations/errors';
import { HttpInstrumentation } from '../instrumentations/http';
import { PerformanceInstrumentation } from '../instrumentations/performance';
import { SessionInstrumentation } from '../instrumentations/session';
import { UserActionInstrumentation } from '../instrumentations/userActions';
import { ViewInstrumentation } from '../instrumentations/view';

import type { GetRNInstrumentationsOptions } from './types';

/**
 * Returns the default set of instrumentations for React Native
 */
export function getRNInstrumentations(options: GetRNInstrumentationsOptions = {}): Instrumentation[] {
  const {
    captureConsole = false,
    trackAppState = true,
    captureErrors = true,
    trackSessions = true,
    trackViews = true,
    trackUserActions = true,
    trackHttpRequests = true,
    trackPerformance = true,
    ignoredHttpUrls = [],
  } = options;

  const instrumentations: Instrumentation[] = [];

  if (captureErrors) {
    instrumentations.push(new ErrorsInstrumentation());
  }

  if (captureConsole) {
    instrumentations.push(new ConsoleInstrumentation());
  }

  if (trackSessions) {
    instrumentations.push(new SessionInstrumentation());
  }

  if (trackViews) {
    instrumentations.push(new ViewInstrumentation());
  }

  if (trackAppState) {
    instrumentations.push(new AppStateInstrumentation());
  }

  if (trackUserActions) {
    instrumentations.push(new UserActionInstrumentation());
  }

  if (trackHttpRequests) {
    instrumentations.push(new HttpInstrumentation({ ignoredUrls: ignoredHttpUrls }));
  }

  if (trackPerformance) {
    instrumentations.push(new PerformanceInstrumentation());
  }

  return instrumentations;
}
