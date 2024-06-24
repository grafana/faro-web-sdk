export { PersistentSessionsManager } from './PersistentSessionsManager';
export { VolatileSessionsManager } from './VolatileSessionManager';

export {
  MAX_SESSION_PERSISTENCE_TIME,
  MAX_SESSION_PERSISTENCE_TIME_BUFFER,
  SESSION_EXPIRATION_TIME,
  SESSION_INACTIVITY_TIME,
  STORAGE_KEY,
  STORAGE_UPDATE_DELAY,
  defaultSessionTrackingConfig,
} from './sessionConstants';

export { isSampled } from './sampling';

export type { FaroUserSession } from './types';

export { getSessionManagerByConfig } from './getSessionManagerByConfig';
