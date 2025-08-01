export { SessionInstrumentation } from './instrumentation';

export {
  MAX_SESSION_PERSISTENCE_TIME,
  MAX_SESSION_PERSISTENCE_TIME_BUFFER,
  PersistentSessionsManager,
  SESSION_EXPIRATION_TIME,
  SESSION_INACTIVITY_TIME,
  STORAGE_KEY,
  STORAGE_UPDATE_DELAY,
  VolatileSessionsManager,
  defaultSessionTrackingConfig,
  isSampled,
} from './sessionManager';

export type { FaroUserSession } from './sessionManager';
