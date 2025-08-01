import type {Span} from "@opentelemetry/api";
import type {InstrumentationConfig} from "@opentelemetry/instrumentation";
import type {AxiosResponse} from "axios";

export interface AxiosInstrumentationOptions extends InstrumentationConfig {
  clearTimingResources?: boolean;
  ignoreUrls?: Array<string | RegExp>;
  measureRequestSize?: boolean;
  applyCustomAttributesOnSpan?: (span: Span, request: AxiosResponse) => void;
}
