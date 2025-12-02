import { AppState, AppStateStatus } from 'react-native';

import { BaseInstrumentation, genShortID, VERSION } from '@grafana/faro-core';

import { getPlatformInfo, performanceStore, toPerformanceTimingString } from './performanceUtils';
import type { FaroAppLaunchItem, FaroScreenNavigationItem, PerformanceInstrumentationOptions } from './types';

/**
 * Performance instrumentation for React Native
 *
 * Tracks performance metrics including:
 * - App launch performance (cold/warm starts)
 * - Screen navigation performance
 * - JavaScript bundle load time
 *
 * @example
 * ```tsx
 * import { initializeFaro, PerformanceInstrumentation } from '@grafana/faro-react-native';
 *
 * initializeFaro({
 *   // ...config
 *   instrumentations: [
 *     new PerformanceInstrumentation({
 *       trackAppLaunch: true,
 *       trackScreenPerformance: true,
 *       trackBundlePerformance: true,
 *     }),
 *   ],
 * });
 * ```
 */
export class PerformanceInstrumentation extends BaseInstrumentation {
  readonly name = '@grafana/faro-react-native:instrumentation-performance';
  readonly version = VERSION;

  private options: Required<PerformanceInstrumentationOptions>;
  private faroLaunchId: string;
  private appStateSubscription?: any;
  private metaUnsubscribe?: () => void;
  private lastScreenId?: string;
  private launchType: 'cold' | 'warm' = 'cold';
  private hasTrackedAppLaunch = false;

  constructor(options: PerformanceInstrumentationOptions = {}) {
    super();
    this.options = {
      trackAppLaunch: options.trackAppLaunch ?? true,
      trackScreenPerformance: options.trackScreenPerformance ?? true,
      trackBundlePerformance: options.trackBundlePerformance ?? true,
      trackReactPerformance: options.trackReactPerformance ?? false,
      trackedComponents: options.trackedComponents ?? [],
    };

    // Generate unique ID for this app launch
    this.faroLaunchId = genShortID();
  }

  initialize(): void {
    this.logInfo('Performance instrumentation initialized');

    // Track app launch performance
    if (this.options.trackAppLaunch) {
      this.trackAppLaunchPerformance();
    }

    // Track screen performance by listening to meta changes
    if (this.options.trackScreenPerformance) {
      this.setupScreenPerformanceTracking();
    }

    // Listen for app state changes to detect warm starts
    this.appStateSubscription = AppState.addEventListener('change', this.handleAppStateChange.bind(this));
  }

  /**
   * Track app launch performance metrics
   */
  private trackAppLaunchPerformance(): void {
    // Only track once per app launch
    if (this.hasTrackedAppLaunch) {
      return;
    }

    try {
      const { platform, platformVersion } = getPlatformInfo();

      // Get timing markers
      const appStartTime = performanceStore.get('app_start') ?? 0;
      const bundleLoadTime = performanceStore.get('bundle_loaded') ?? 0;
      const firstScreenTime = performanceStore.get('first_screen_rendered') ?? Date.now();

      // Calculate durations
      const jsBundleLoadTime = bundleLoadTime - appStartTime;
      const timeToFirstScreen = firstScreenTime - appStartTime;
      const totalLaunchTime = timeToFirstScreen;

      const appLaunchItem: FaroAppLaunchItem = {
        faroLaunchId: this.faroLaunchId,
        platform,
        platformVersion,
        launchType: this.launchType,
        jsBundleLoadTime: toPerformanceTimingString(jsBundleLoadTime),
        timeToFirstScreen: toPerformanceTimingString(timeToFirstScreen),
        totalLaunchTime: toPerformanceTimingString(totalLaunchTime),
      };

      // Push event
      this.api.pushEvent('faro.performance.app_launch', appLaunchItem, {
        skipDedupe: true,
      });

      this.hasTrackedAppLaunch = true;
      this.logDebug('App launch performance tracked', {
        launchType: this.launchType,
        totalLaunchTime: appLaunchItem.totalLaunchTime,
      });
    } catch (error) {
      this.logError('Failed to track app launch performance', error);
    }
  }

  /**
   * Setup screen performance tracking by listening to meta changes
   */
  private setupScreenPerformanceTracking(): void {
    // Subscribe to meta changes to detect screen changes
    this.metaUnsubscribe = this.metas.addListener((meta) => {
      // Look for screen/view meta changes
      if (meta.screen || meta.view) {
        const screenName = meta.screen?.name || meta.view?.name;
        if (screenName) {
          this.trackScreenNavigation(screenName);
        }
      }
    });
  }

  /**
   * Track screen navigation performance
   */
  private trackScreenNavigation(screenName: string): void {
    try {
      // End previous screen marker if exists
      let transitionTime: number | undefined;
      if (performanceStore.hasMarker('screen_navigation')) {
        transitionTime = performanceStore.endMarker('screen_navigation');
      }

      // Start new screen marker
      const marker = performanceStore.startMarker('screen_navigation');

      // Generate screen ID
      const faroScreenId = genShortID();

      // Calculate mount time (simplified - in real app this would be from navigation event to component mount)
      const mountTime = marker.getDuration();

      // Store previous screen name for next navigation
      const previousScreen = performanceStore.get('last_screen_name');
      performanceStore.set('last_screen_name', screenName as any);

      const screenNavigationItem: FaroScreenNavigationItem = {
        faroScreenId,
        faroLaunchId: this.faroLaunchId,
        faroPreviousScreenId: this.lastScreenId || undefined,
        screenName,
        previousScreen: previousScreen ? String(previousScreen) : undefined,
        mountTime: toPerformanceTimingString(mountTime),
        transitionTime: transitionTime !== undefined ? toPerformanceTimingString(transitionTime) : undefined,
        navigationType: 'unknown', // Would need React Navigation integration for accurate type
      };

      // Push event
      this.api.pushEvent('faro.performance.screen', screenNavigationItem, {
        skipDedupe: true,
      });

      this.lastScreenId = faroScreenId;

      this.logDebug('Screen navigation performance tracked', {
        screenName,
        mountTime: screenNavigationItem.mountTime,
      });

      // Mark first screen rendered for app launch tracking
      if (!performanceStore.get('first_screen_rendered')) {
        performanceStore.set('first_screen_rendered', Date.now());

        // Track app launch now that first screen is rendered
        if (this.options.trackAppLaunch && !this.hasTrackedAppLaunch) {
          this.trackAppLaunchPerformance();
        }
      }
    } catch (error) {
      this.logError('Failed to track screen navigation performance', error);
    }
  }

  /**
   * Handle app state changes to detect warm starts
   */
  private handleAppStateChange(nextAppState: AppStateStatus): void {
    if (nextAppState === 'active') {
      // App is coming to foreground - this is a warm start
      this.launchType = 'warm';
      this.hasTrackedAppLaunch = false; // Allow tracking of warm start

      if (this.options.trackAppLaunch) {
        // Reset timing for warm start
        performanceStore.set('app_start', Date.now());
        performanceStore.set('bundle_loaded', Date.now()); // Bundle already loaded for warm start

        // Track warm start after a brief delay to capture first screen render
        setTimeout(() => {
          if (!this.hasTrackedAppLaunch) {
            this.trackAppLaunchPerformance();
          }
        }, 100);
      }
    }
  }

  unpatch(): void {
    // Clean up app state subscription
    if (this.appStateSubscription) {
      this.appStateSubscription.remove();
      this.appStateSubscription = undefined;
    }

    // Clean up meta listener
    if (this.metaUnsubscribe) {
      this.metaUnsubscribe();
      this.metaUnsubscribe = undefined;
    }

    // Clear performance store
    performanceStore.clear();
  }
}

/**
 * Mark the app start time
 * Call this as early as possible in your app's entry point (index.js)
 *
 * @example
 * ```tsx
 * // index.js
 * import { markAppStart } from '@grafana/faro-react-native';
 * markAppStart(); // Call immediately
 *
 * import { AppRegistry } from 'react-native';
 * import App from './App';
 * // ...
 * ```
 */
export function markAppStart(): void {
  performanceStore.set('app_start', Date.now());
}

/**
 * Mark when the JS bundle has loaded
 * Call this after all your imports and before rendering
 *
 * @example
 * ```tsx
 * // App.tsx
 * import { markBundleLoaded } from '@grafana/faro-react-native';
 *
 * markBundleLoaded(); // Call after imports
 *
 * export function App() {
 *   return <View>...</View>;
 * }
 * ```
 */
export function markBundleLoaded(): void {
  performanceStore.set('bundle_loaded', Date.now());
}

/**
 * Manual API to track screen navigation performance
 * Use this if you're not using ViewInstrumentation
 *
 * @example
 * ```tsx
 * import { trackScreenPerformance } from '@grafana/faro-react-native';
 *
 * function MyScreen() {
 *   useEffect(() => {
 *     trackScreenPerformance('MyScreen', 'push');
 *   }, []);
 *
 *   return <View>...</View>;
 * }
 * ```
 */
export function trackScreenPerformance(
  screenName: string,
  _navigationType: 'push' | 'pop' | 'replace' | 'reset' = 'push'
): void {
  performanceStore.startMarker(`screen_${screenName}`);
}
