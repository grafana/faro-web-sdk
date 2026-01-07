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
   * Track performance metrics (app launch, screen navigation) (default: true)
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

  /**
   * Track user actions/interactions (default: true)
   */
  trackUserActions?: boolean;

  /**
   * Track HTTP/fetch requests (default: true)
   */
  trackHttpRequests?: boolean;

  /**
   * Track app startup time from process start to Faro init (default: true)
   * Uses native OS APIs - no AppDelegate/MainActivity setup required!
   * Requires: iOS 13.4+, Android API 24+
   */
  trackStartup?: boolean;

  /**
   * Enable memory usage monitoring (default: true)
   * Monitors RSS (Resident Set Size) - physical memory used by the app
   * Uses native OS APIs - no manual setup required!
   * Requires: iOS 13.4+, Android any version
   */
  memoryUsageVitals?: boolean;

  /**
   * Enable CPU usage monitoring (default: true)
   * Monitors CPU usage percentage via differential calculation
   * Uses native OS APIs - no manual setup required!
   * Requires: iOS 13.4+, Android API 21+
   */
  cpuUsageVitals?: boolean;

  /**
   * Interval (in milliseconds) for collecting performance vitals (default: 30000 - 30 seconds)
   * Controls how often memory and CPU metrics are collected and sent
   * Minimum recommended: 5000ms (5 seconds) to avoid overhead
   */
  fetchVitalsInterval?: number;

  /**
   * URLs to ignore for HTTP tracking (regex patterns)
   */
  ignoredHttpUrls?: RegExp[];
}
