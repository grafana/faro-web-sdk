/**
 * Performance instrumentation types for React Native
 */

/**
 * App launch performance metrics
 */
export interface AppLaunchTiming {
  /** Time from app start to JS bundle loaded (ms) */
  jsBundleLoadTime: string;

  /** Time from app start to first screen rendered (ms) */
  timeToFirstScreen: string;

  /** Total app launch time (ms) */
  totalLaunchTime: string;

  /** Launch type: cold (app not in memory) or warm (app in background) */
  launchType: 'cold' | 'warm';
}

/**
 * Screen navigation performance metrics
 */
export interface ScreenNavigationTiming {
  /** Screen/route name */
  screenName: string;

  /** Time from navigation start to screen component mount (ms) */
  mountTime: string;

  /** Time from previous screen unmount to new screen mount (ms) */
  transitionTime?: string;

  /** Navigation type (push, pop, replace, reset) */
  navigationType: 'push' | 'pop' | 'replace' | 'reset' | 'unknown';

  /** Previous screen name (for tracking journeys) */
  previousScreen?: string;
}

/**
 * JavaScript bundle performance metrics
 */
export interface BundleTiming {
  /** Time to load the JavaScript bundle (ms) */
  loadTime: string;

  /** Time to execute/initialize modules (ms) */
  initTime: string;

  /** Total bundle execution time (ms) */
  totalTime: string;
}

/**
 * React component performance metrics (from Profiler API)
 */
export interface ReactPerformanceTiming {
  /** Component ID */
  componentId: string;

  /** Phase: mount or update */
  phase: 'mount' | 'update';

  /** Time spent rendering (ms) */
  actualDuration: string;

  /** Estimated time to render (ms) */
  baseDuration: string;

  /** When the render started */
  startTime: string;

  /** When the component committed */
  commitTime: string;
}

/**
 * Performance event item for app launch
 */
export interface FaroAppLaunchItem extends AppLaunchTiming {
  /** Unique ID for this app launch */
  faroLaunchId: string;

  /** Platform (ios/android) */
  platform: string;

  /** Platform version */
  platformVersion: string;
}

/**
 * Performance event item for screen navigation
 */
export interface FaroScreenNavigationItem extends ScreenNavigationTiming {
  /** Unique ID for this screen navigation */
  faroScreenId: string;

  /** Launch ID (links to app launch) */
  faroLaunchId?: string;

  /** Previous screen ID (for journey tracking) */
  faroPreviousScreenId?: string;
}

/**
 * Performance event item for bundle loading
 */
export interface FaroBundleItem extends BundleTiming {
  /** Unique ID for this bundle load */
  faroBundleId: string;

  /** Launch ID (links to app launch) */
  faroLaunchId?: string;
}

/**
 * Performance event item for React profiling
 */
export interface FaroReactPerformanceItem extends ReactPerformanceTiming {
  /** Unique ID for this profiling entry */
  faroProfilerId: string;

  /** Screen ID (links to screen navigation) */
  faroScreenId?: string;
}

/**
 * Configuration options for PerformanceInstrumentation
 *
 * **Note:** App launch and bundle load tracking require a native SDK
 * that initializes before JavaScript loads. This is not currently
 * supported by the JS-only Faro SDK.
 */
export interface PerformanceInstrumentationOptions {
  /**
   * Track screen navigation performance
   * Requires ViewInstrumentation or manual screen tracking
   * @default true
   */
  trackScreenPerformance?: boolean;

  /**
   * Track React component performance using Profiler API
   * Warning: May have performance overhead
   * @default false
   */
  trackReactPerformance?: boolean;

  /**
   * Component IDs to track with React Profiler
   * If empty, no components are tracked
   * @example ['App', 'HomeScreen', 'ProfileScreen']
   */
  trackedComponents?: string[];
}
