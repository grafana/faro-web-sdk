import type {InstrumentationConfig} from "@opentelemetry/instrumentation";
import type * as web from "@opentelemetry/sdk-trace-web";

export interface AxiosInstrumentationOptions extends InstrumentationConfig {
  clearTimingResources?: boolean;
  propagateTraceHeaderCorsUrls?: web.PropagateTraceHeaderCorsUrls;
  ignoreUrls?: Array<string | RegExp>;
  ignoreNetworkEvents?: boolean;
  measureRequestSize?: boolean;
}
