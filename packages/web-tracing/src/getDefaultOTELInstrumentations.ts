import type { InstrumentationOption } from '@opentelemetry/instrumentation';
import { DocumentLoadInstrumentation } from '@opentelemetry/instrumentation-document-load';

export function getDefaultOTELInstrumentations(): InstrumentationOption[] {
  return [
    new DocumentLoadInstrumentation(),
    // new FetchInstrumentation(options),
    // new XMLHttpRequestInstrumentation(options),
  ];
}
