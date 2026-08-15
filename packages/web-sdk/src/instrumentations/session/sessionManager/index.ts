export { PersistentSessionsManager } from './PersistentSessionsManager';
export { VolatileSessionsManager } from './VolatileSessionManager';

export {
  MAX_SESSION_PERSISTENCE_TIME,
  SESSION_EXPIRATION_TIME,
  SESSION_INACTIVITY_TIME,
  STORAGE_KEY,
  STORAGE_UPDATE_DELAY,
  defaultSessionTrackingConfig,
} from './sessionConstants';

export { getSessionStorageKey } from './getSessionStorageKey';

export { isSampled } from './sampling';

export type { FaroUserSession, SessionManagerInstance, SessionManager } from './types';

export { getSessionManagerByConfig } from './getSessionManagerByConfig';
