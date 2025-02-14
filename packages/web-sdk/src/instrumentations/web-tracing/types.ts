import type { Instrumentation } from '@opentelemetry/instrumentation';

import type { API } from '@grafana/faro-core';

// type got remove by with experimental/v0.52.0 and is replaced by the following type:
// See: https://github.com/open-telemetry/opentelemetry-js/releases/tag/experimental%2Fv0.52.0
export type InstrumentationOption = Instrumentation | Instrumentation[];

export interface FaroTraceExporterConfig {
  api: API;
}
