import { BaseInstrumentation, genShortID, VERSION } from '@grafana/faro-core';

import { performanceStore, toPerformanceTimingString } from './performanceUtils';
import type { FaroScreenNavigationItem, PerformanceInstrumentationOptions } from './types';

/**
 * Performance instrumentation for React Native
 *
 * **Important:** This instrumentation only tracks screen navigation performance.
 * True app launch metrics (cold/warm start times) require a native SDK that
 * initializes before JavaScript loads. See the Honeycomb OpenTelemetry example
 * for reference: https://github.com/honeycombio/honeycomb-opentelemetry-react-native
 *
 * Currently tracks:
 * - Screen navigation performance (mount time, transition time)
 *
 * @example
 * ```tsx
 * import { initializeFaro, PerformanceInstrumentation } from '@grafana/faro-react-native';
 *
 * initializeFaro({
 *   // ...config
 *   instrumentations: [
 *     new PerformanceInstrumentation({
 *       trackScreenPerformance: true,
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
  private metaUnsubscribe?: () => void;
  private lastScreenId?: string;

  constructor(options: PerformanceInstrumentationOptions = {}) {
    super();
    this.options = {
      trackScreenPerformance: options.trackScreenPerformance ?? true,
      trackReactPerformance: options.trackReactPerformance ?? false,
      trackedComponents: options.trackedComponents ?? [],
    };

    // Generate unique ID for this app launch session
    this.faroLaunchId = genShortID();
  }

  initialize(): void {
    this.logInfo('Performance instrumentation initialized');

    // Track screen performance by listening to meta changes
    if (this.options.trackScreenPerformance) {
      this.setupScreenPerformanceTracking();
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
    } catch (error) {
      this.logError('Failed to track screen navigation performance', error);
    }
  }

  unpatch(): void {
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
