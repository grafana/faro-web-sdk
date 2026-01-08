export { FaroTraceExporter } from './exporters/faroTraceExporter';

export { getDefaultOTELInstrumentations } from './instrumentations/getDefaultOTELInstrumentations';

export { TracingInstrumentation } from './instrumentation';

export { getSamplingDecision } from './utils/sampler';

export type { FaroTraceExporterConfig, TracingInstrumentationOptions } from './types';

export {
  setSpanStatusOnFetchError,
  fetchCustomAttributeFunctionWithDefaults,
} from './instrumentations/instrumentationUtils';

export { FaroMetaAttributesSpanProcessor } from './processors/faroMetaAttributesSpanProcessor';
