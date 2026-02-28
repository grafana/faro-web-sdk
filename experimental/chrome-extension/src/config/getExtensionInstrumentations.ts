import type { Instrumentation } from '@grafana/faro-core';
import {
  PerformanceInstrumentation,
  ViewInstrumentation,
  WebVitalsInstrumentation,
} from '@grafana/faro-web-sdk';
import { TracingInstrumentation } from '@grafana/faro-web-tracing';
import type { TracingInstrumentationOptions } from '@grafana/faro-web-tracing';

import { ConsoleInstrumentation, ExtensionErrorsInstrumentation, ExtensionSessionInstrumentation } from '../instrumentations';

import type { ExtensionContext } from './types';

export function getExtensionInstrumentations(
  context: ExtensionContext,
  tracingOptions?: TracingInstrumentationOptions
): Instrumentation[] {
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
      new TracingInstrumentation(tracingOptions),
    ];
  }

  return baseInstrumentations;
}
