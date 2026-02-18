import type { Instrumentation } from '@grafana/faro-core';
import {
  PerformanceInstrumentation,
  ViewInstrumentation,
  WebVitalsInstrumentation,
} from '@grafana/faro-web-sdk';

import { ConsoleInstrumentation, ExtensionErrorsInstrumentation, ExtensionSessionInstrumentation } from '../instrumentations';

import type { ExtensionContext } from './types';

export function getExtensionInstrumentations(context: ExtensionContext): Instrumentation[] {
  const baseInstrumentations: Instrumentation[] = [
    new ExtensionErrorsInstrumentation(),
    new ConsoleInstrumentation(),
    new ExtensionSessionInstrumentation(),
  ];

  if (context === 'content-script' || context === 'popup') {
    return [
      ...baseInstrumentations,
      new WebVitalsInstrumentation(),
      new PerformanceInstrumentation(),
      new ViewInstrumentation(),
    ];
  }

  return baseInstrumentations;
}
