export { FaroTraceExporter } from './faroTraceExporter';

export { FaroSessionSpanProcessor } from './sessionSpanProcessor';

export { getDefaultOTELInstrumentations } from './getDefaultOTELInstrumentations';

export { TracingInstrumentation } from './instrumentation';

export { getSamplingDecision } from './sampler';

export type { FaroTraceExporterConfig, TracingInstrumentationOptions } from './types';

export { setSpanStatusOnFetchError, fetchCustomAttributeFunctionWithDefaults } from './instrumentationUtils';
