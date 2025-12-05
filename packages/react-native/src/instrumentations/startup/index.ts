import { BaseInstrumentation, VERSION } from '@grafana/faro-core';
import { NativeModules } from 'react-native';

import type { StartupInstrumentationOptions } from './types';

const { FaroReactNativeModule } = NativeModules;

/**
 * Measures React Native app startup time from process start to Faro SDK initialization
 *
 * Uses native OS APIs to get accurate startup timing without requiring any
 * AppDelegate or MainActivity setup:
 * - iOS: sysctl() to query kernel for process start time
 * - Android: Process.getStartElapsedRealtime() from Android OS (API 24+)
 *
 * Implementation ported from Faro Flutter SDK:
 * https://github.com/grafana/faro-flutter-sdk
 *
 * **Key Features**:
 * - ✅ NO AppDelegate/MainActivity setup required - OS tracks process start automatically!
 * - ✅ Uses OS-level APIs for accurate timing
 * - ✅ Simple installation - just install native module and rebuild
 *
 * **Metrics Captured**:
 * - `total_duration_ms`: Total time from process start to Faro init
 *   - Includes: Native init, RN runtime, JS bundle load, JS execution, Faro init
 *
 * **Requirements**:
 * - iOS 13.4+ (any iOS that supports React Native)
 * - Android API 24+ (Android 7.0 Nougat, ~99% of devices as of 2025)
 *
 * @example
 * ```tsx
 * import { initializeFaro, getRNInstrumentations } from '@grafana/faro-react-native';
 *
 * initializeFaro({
 *   url: 'https://your-collector.com',
 *   instrumentations: [
 *     ...getRNInstrumentations({ trackStartup: true }),
 *   ],
 * });
 * ```
 */
export class StartupInstrumentation extends BaseInstrumentation {
  readonly name = '@grafana/faro-react-native:instrumentation-startup';
  readonly version = VERSION;

  constructor(private options: StartupInstrumentationOptions = {}) {
    super();
  }

  initialize(): void {
    if (this.options.enabled === false) {
      return;
    }

    this.captureStartupMetrics();
  }

  private captureStartupMetrics(): void {
    try {
      console.log('[STARTUP DEBUG] captureStartupMetrics called');
      console.log('[STARTUP DEBUG] FaroReactNativeModule:', FaroReactNativeModule);

      // Get startup duration from native module
      if (!FaroReactNativeModule?.getAppStartDuration) {
        this.logWarn(
          'Native module not available. Startup instrumentation requires native module. ' +
            'Run `cd ios && pod install` and rebuild the app.'
        );
        console.log('[STARTUP DEBUG] Native module not available - exiting');
        return;
      }

      console.log('[STARTUP DEBUG] Calling getAppStartDuration...');
      // Call native method to get duration (calculated on-demand by OS APIs)
      const appStartDuration = FaroReactNativeModule.getAppStartDuration();
      console.log('[STARTUP DEBUG] App start duration received:', appStartDuration);

      if (appStartDuration === 0) {
        this.logWarn(
          'App startup duration is 0. This may indicate unsupported Android version (< API 24) ' +
            'or an issue with the native module.'
        );
        console.log('[STARTUP DEBUG] Duration is 0 - exiting');
        return;
      }

      const values: Record<string, number> = {
        // Total time from process start to Faro init
        // Includes: native init + RN runtime + JS bundle load + JS execution + Faro init
        total_duration_ms: appStartDuration,
      };

      console.log('[STARTUP DEBUG] Pushing measurement:', { type: 'app_startup', values });
      this.api.pushMeasurement(
        { type: 'app_startup', values },
        {
          skipDedupe: true,
        }
      );

      this.logInfo(`Startup metrics captured successfully: ${appStartDuration}ms`);
      console.log('[STARTUP DEBUG] Measurement pushed successfully');
    } catch (error) {
      this.logError('Failed to capture startup metrics', error);
      console.error('[STARTUP DEBUG] Error:', error);
    }
  }

  unpatch(): void {
    // No cleanup needed
  }
}
