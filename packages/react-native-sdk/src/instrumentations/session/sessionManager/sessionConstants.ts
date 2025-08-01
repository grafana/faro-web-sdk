import type { Config } from '@grafana/faro-core';

export const STORAGE_KEY = 'com.grafana.faro.session';
export const SESSION_EXPIRATION_TIME = 4 * 60 * 60 * 1000; // hrs
export const SESSION_INACTIVITY_TIME = 15 * 60 * 1000; // minutes
export const STORAGE_UPDATE_DELAY = 1 * 1000; // seconds

/**
 * @deprecated MAX_SESSION_PERSISTENCE_TIME_BUFFER is not used anymore. The constant will be removed in the future
 */
export const MAX_SESSION_PERSISTENCE_TIME_BUFFER = 1 * 60 * 1000;
export const MAX_SESSION_PERSISTENCE_TIME = SESSION_INACTIVITY_TIME;

export const defaultSessionTrackingConfig: Config['sessionTracking'] = {
  enabled: true,
  persistent: false,
  maxSessionPersistenceTime: MAX_SESSION_PERSISTENCE_TIME,
} as const;
