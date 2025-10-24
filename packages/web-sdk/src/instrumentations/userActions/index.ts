export { UserActionInstrumentation } from './instrumentation';

export type {
  DomMutationMessage,
  HttpRequestEndMessage,
  HttpRequestStartMessage,
  HttpRequestMessagePayload,
} from '../_internal/monitors/types';

export {
  MESSAGE_TYPE_DOM_MUTATION,
  MESSAGE_TYPE_HTTP_REQUEST_END,
  MESSAGE_TYPE_HTTP_REQUEST_START,
} from '../_internal/monitors/const';

export { monitorDomMutations } from '../_internal/monitors/domMutationMonitor';
export { monitorHttpRequests } from '../_internal/monitors/httpRequestMonitor';
export { monitorPerformanceEntries } from '../_internal/monitors/performanceEntriesMonitor';

export { userActionDataAttribute } from './const';
