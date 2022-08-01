import type { InstrumentationOption } from '@opentelemetry/instrumentation';
import { DocumentLoadInstrumentation } from '@opentelemetry/instrumentation-document-load';
import { FetchInstrumentation } from '@opentelemetry/instrumentation-fetch';
import { UserInteractionInstrumentation } from '@opentelemetry/instrumentation-user-interaction';
import { XMLHttpRequestInstrumentation } from '@opentelemetry/instrumentation-xml-http-request';

export function getDefaultOTELInstrumentations(ignoreUrls: Array<string | RegExp> = []): InstrumentationOption[] {
  return [
    new DocumentLoadInstrumentation(),
    new FetchInstrumentation({ ignoreUrls }),
    new XMLHttpRequestInstrumentation({ ignoreUrls }),
    new UserInteractionInstrumentation(),
  ];
}
