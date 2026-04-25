import type { API } from './types';

export function getNoopAPI(): API {
  return {
    pushLog: () => {},
    pushError: () => {},
    changeStacktraceParser: () => {},
    getStacktraceParser: () => undefined,
    pushMeasurement: () => {},
    pushTraces: () => {},
    getOTEL: () => undefined,
    getTraceContext: () => undefined,
    initOTEL: () => {},
    isOTELInitialized: () => false,
    setUser: () => {},
    resetUser: () => {},
    setSession: () => {},
    resetSession: () => {},
    getSession: () => undefined,
    setView: () => {},
    getView: () => undefined,
    setPage: () => {},
    getPage: () => undefined,
    pushEvent: () => {},
    startUserAction: () => undefined,
    getActiveUserAction: () => undefined,
  };
}
