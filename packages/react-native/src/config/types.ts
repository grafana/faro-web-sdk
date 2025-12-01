import type { Config } from '@grafana/faro-core';

/**
 * React Native-specific configuration options
 */
export interface ReactNativeConfig extends Omit<Config, 'metas'> {
  /**
   * Optional metas to include. If not provided, default RN metas will be used
   */
  metas?: Config['metas'];
}

/**
 * Options for getRNInstrumentations
 */
export interface GetRNInstrumentationsOptions {
  /**
   * Capture console logs (default: false)
   */
  captureConsole?: boolean;

  /**
   * Track app state changes (background/foreground) (default: true)
   */
  trackAppState?: boolean;

  /**
   * Track performance metrics (default: false)
   */
  trackPerformance?: boolean;

  /**
   * Capture errors (default: true)
   */
  captureErrors?: boolean;

  /**
   * Track sessions (default: true)
   */
  trackSessions?: boolean;

  /**
   * Track view/screen changes (default: true)
   */
  trackViews?: boolean;
}
