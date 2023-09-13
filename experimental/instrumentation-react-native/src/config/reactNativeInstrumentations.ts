import { FetchInstrumentation } from '@grafana/faro-instrumentation-fetch';

export const getReactNativeInstrumentations = () => {
  return [new FetchInstrumentation()];
};
