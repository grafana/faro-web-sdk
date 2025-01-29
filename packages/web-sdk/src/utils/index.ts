export {
  isLocalStorageAvailable,
  isSessionStorageAvailable,
  webStorageType,
  getItem,
  isWebStorageAvailable,
  removeItem,
  setItem,
} from './webStorage';

export { throttle } from './throttle';

export { getCircularDependencyReplacer, stringifyExternalJson } from '@grafana/faro-core/src/utils/json';

export { getIgnoreUrls } from './url';

export { getDetailsFromErrorArgs } from './errors';
