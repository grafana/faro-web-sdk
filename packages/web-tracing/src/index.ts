export { FaroTraceExporter } from './faroTraceExporter';

export { getDefaultOTELInstrumentations } from './getDefaultOTELInstrumentations';

export { TracingInstrumentation } from './instrumentation';

export { getSamplingDecision } from './sampler';

export type { FaroTraceExporterConfig, TracingInstrumentationOptions, UrlMatcher, UrlMatcherTarget } from './types';
export type { TracingMode } from './tracingRegistry';

export { setSpanStatusOnFetchError, fetchCustomAttributeFunctionWithDefaults } from './instrumentationUtils';

export { FaroMetaAttributesSpanProcessor } from './faroMetaAttributesSpanProcessor';

export { FaroPausablePropagator } from './faroPausablePropagator';

export { FaroUserActionSpanProcessor } from './faroUserActionSpanProcessor';
