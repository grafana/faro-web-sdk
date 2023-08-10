import { FetchInstrumentation } from "@grafana/faro-instrumentation-fetch";
import { TracingInstrumentation } from "@grafana/faro-web-tracing";

export const getReactNativeInstrumentations = () => {
  return [
    new FetchInstrumentation(),
    new TracingInstrumentation(),
  ]
};
