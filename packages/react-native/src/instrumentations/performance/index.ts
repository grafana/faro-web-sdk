import { NativeModules } from 'react-native';

import { BaseInstrumentation, VERSION } from '@grafana/faro-core';

import type { PerformanceInstrumentationOptions } from './types';

const { FaroReactNativeModule } = NativeModules;

/**
 * Measures React Native app performance metrics (CPU and Memory usage)
 *
 * Collects periodic performance metrics using native OS APIs:
 * - iOS: task_info() for memory, host_statistics() for CPU
 * - Android: /proc/[pid]/status for memory, /proc/[pid]/stat for CPU
 *
 * Implementation ported from Faro Flutter SDK with feature parity.
 *
 * **Key Features**:
 * - ✅ NO manual setup required - OS tracks metrics automatically!
 * - ✅ Periodic collection (default: every 30 seconds)
 * - ✅ Configurable per-metric enable/disable
 * - ✅ Differential CPU calculation (accurate usage percentages)
 * - ✅ Memory usage in KB (Resident Set Size)
 *
 * **Metrics Captured**:
 * - `mem_usage`: Current memory usage in KB (RSS - physical memory)
 * - `cpu_usage`: Current CPU usage percentage (0-100+)
 *
 * **Requirements**:
 * - iOS 13.4+ (any iOS that supports React Native)
 * - Android API 21+ for CPU (Android 5.0 Lollipop, ~99% of devices)
 * - Android any version for Memory
 *
 * @example
 * ```tsx
 * import { initializeFaro, getRNInstrumentations } from '@grafana/faro-react-native';
 *
 * initializeFaro({
 *   url: 'https://your-collector.com',
 *   instrumentations: [
 *     ...getRNInstrumentations({
 *       memoryUsageVitals: true,      // default: true
 *       cpuUsageVitals: true,          // default: true
 *       fetchVitalsInterval: 30000,    // default: 30s
 *     }),
 *   ],
 * });
 * ```
 */
export class PerformanceInstrumentation extends BaseInstrumentation {
  readonly name = '@grafana/faro-react-native:instrumentation-performance';
  readonly version = VERSION;

  private options: Required<PerformanceInstrumentationOptions>;
  private intervalId: ReturnType<typeof setInterval> | null = null;

  constructor(options: PerformanceInstrumentationOptions = {}) {
    super();
    this.options = {
      memoryUsageVitals: options.memoryUsageVitals ?? true,
      cpuUsageVitals: options.cpuUsageVitals ?? true,
      fetchVitalsInterval: options.fetchVitalsInterval ?? 30000,
    };
  }

  initialize(): void {
    // Only start if at least one metric is enabled
    if (!this.options.memoryUsageVitals && !this.options.cpuUsageVitals) {
      this.logInfo('Performance monitoring disabled - no metrics enabled');
      return;
    }

    // Check native module availability
    if (!FaroReactNativeModule) {
      this.logWarn(
        'Native module not available. Performance instrumentation requires native module. ' +
          'Run `cd ios && pod install` and rebuild the app.'
      );
      return;
    }

    // Start periodic collection
    this.startPeriodicCollection();
  }

  private startPeriodicCollection(): void {
    // Collect immediately on initialization
    this.collectMetrics();

    // Then collect periodically
    this.intervalId = setInterval(() => {
      this.collectMetrics();
    }, this.options.fetchVitalsInterval);

    this.logInfo(
      `Performance monitoring started - collecting every ${this.options.fetchVitalsInterval}ms ` +
        `(memory: ${this.options.memoryUsageVitals}, cpu: ${this.options.cpuUsageVitals})`
    );
  }

  private collectMetrics(): void {
    // Collect memory if enabled
    if (this.options.memoryUsageVitals) {
      this.collectMemoryUsage();
    }

    // Collect CPU if enabled
    if (this.options.cpuUsageVitals) {
      this.collectCpuUsage();
    }
  }

  private collectMemoryUsage(): void {
    try {
      if (!FaroReactNativeModule?.getMemoryUsage) {
        return;
      }

      const memoryUsage = FaroReactNativeModule.getMemoryUsage();

      if (memoryUsage == null || memoryUsage <= 0) {
        return;
      }

      this.api.pushMeasurement(
        {
          type: 'app_memory',
          values: {
            mem_usage: memoryUsage,
          },
        },
        {
          skipDedupe: true,
        }
      );
    } catch (error) {
      this.logError('Failed to collect memory usage', error);
    }
  }

  private collectCpuUsage(): void {
    try {
      if (!FaroReactNativeModule?.getCpuUsage) {
        return;
      }

      const cpuUsage = FaroReactNativeModule.getCpuUsage();

      // Validate CPU usage (Flutter SDK filters 0-100 range, but allows >100)
      // Skip null, negative, or exactly 0 (baseline reading)
      if (cpuUsage == null || cpuUsage <= 0) {
        return;
      }

      // Flutter SDK also filters values >= 100, but we allow them as they can be valid
      // in multi-core scenarios where one core is maxed out
      this.api.pushMeasurement(
        {
          type: 'app_cpu_usage',
          values: {
            cpu_usage: cpuUsage,
          },
        },
        {
          skipDedupe: true,
        }
      );
    } catch (error) {
      this.logError('Failed to collect CPU usage', error);
    }
  }

  unpatch(): void {
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
      this.logInfo('Performance monitoring stopped');
    }
  }
}
