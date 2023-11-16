export const STORAGE_KEY = '__FARO_SESSION__';
export const SESSION_EXPIRATION_TIME = 4 * 60 * 60 * 1000; // hrs
export const SESSION_INACTIVITY_TIME = 15 * 60 * 1000; // minutes
export const STORAGE_UPDATE_DELAY = 1 * 1000; // seconds

export const MAX_SESSION_PERSISTENCE_TIME_BUFFER = 5 * 60 * 1000;
export const MAX_SESSION_PERSISTENCE_TIME = SESSION_EXPIRATION_TIME + MAX_SESSION_PERSISTENCE_TIME_BUFFER;

export const defaultSessionTrackingConfig = {
  enabled: false,
  persistent: false,
  maxSessionPersistenceTime: MAX_SESSION_PERSISTENCE_TIME,
} as const;
