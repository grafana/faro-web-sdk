# React Native Startup Instrumentation Implementation Plan

**Status**: Draft
**Date**: December 4, 2025
**Author**: Based on Honeycomb OpenTelemetry React Native analysis

---

## Executive Summary

Implement native startup timing measurement in `@grafana/faro-react-native` by **porting the existing Faro Flutter SDK implementation**. This approach uses OS-level APIs to measure app launch time from process start to Faro SDK initialization.

### Key Decision: Use Faro Flutter SDK Approach

**Why**: Faro already has a working, production-tested startup instrumentation in the Flutter SDK that can be directly ported to React Native.

**Major Advantages**:
- ✅ **NO user setup required** - No AppDelegate/MainActivity changes needed!
- ✅ **OS-accurate timing** - Uses iOS `sysctl()` and Android `Process.getStartElapsedRealtime()`
- ✅ **Simpler than Honeycomb** - On-demand calculation instead of manual timestamp capture
- ✅ **Already Grafana** - Same team, maintainer available for consultation
- ✅ **Battle-tested** - Shipping in production Flutter apps

**User Experience**:
```bash
# iOS
cd ios && pod install

# Android - no setup needed

# Rebuild
yarn ios  # or yarn android
```

That's it! No code changes in AppDelegate or MainActivity required.

---

## Research Findings

### Analysis of Faro Flutter SDK Implementation (RECOMMENDED)

**Location**: `/Users/srsholmes/Work/faro-flutter-sdk`

The Faro Flutter SDK already has a working implementation that we can port to React Native. This is the **preferred approach** because:
- ✅ Already a Grafana solution (same team)
- ✅ Much simpler than Honeycomb's approach
- ✅ Uses OS APIs instead of manual timestamp capture
- ✅ More accurate timing from kernel/system level
- ✅ Maintainer is available for consultation

#### iOS Implementation (`ios/Classes/AppStart.swift`)

**Key Method**: `getAppStartDuration()` (lines 35-57)

```swift
static func getAppStartDuration() -> Double {
  var appStartDuration: Double = 0.0
  var kinfo = kinfo_proc()
  var size = MemoryLayout<kinfo_proc>.stride
  var mib: [Int32] = [CTL_KERN, KERN_PROC, KERN_PROC_PID, getpid()]
  sysctl(&mib, u_int(mib.count), &kinfo, &size, nil, 0)

  let start_time = kinfo.kp_proc.p_starttime
  var time: timeval = timeval(tv_sec: 0, tv_usec: 0)
  gettimeofday(&time, nil)

  let currentTimeMilliseconds = Double(Int64(time.tv_sec) * 1000) + Double(time.tv_usec) / 1000.0
  let processTimeMilliseconds = Double(Int64(start_time.tv_sec) * 1000) + Double(start_time.tv_usec) / 1000.0

  appStartDuration = (currentTimeMilliseconds - processTimeMilliseconds)
  return appStartDuration
}
```

**How it works**:
- Uses `sysctl()` system call with `KERN_PROC` to query process info from kernel
- Gets actual process start time (`p_starttime`) from kernel data
- No need to capture timestamps manually - OS already tracks this!
- Much more accurate than manual timestamp capture

#### Android Implementation (`android/.../FaroPlugin.java`)

**Key Method**: `getAppStart()` (lines 508-513)

```java
private long getAppStart(){
    if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.N) {
        return SystemClock.elapsedRealtime() - Process.getStartElapsedRealtime();
    }
    return 0;
}
```

**How it works**:
- Uses `Process.getStartElapsedRealtime()` - Android API that returns when process started
- Subtracts from current elapsed time to get startup duration
- Available on Android N (API 24+) - released 2016
- No manual timestamp capture needed!

#### Flutter Integration Pattern (`lib/src/integrations/native_integration.dart`)

```dart
Future<void> getAppStart() async {
  try {
    final appStart = await Faro().nativeChannel?.getAppStart();
    if (appStart != null) {
      Faro().pushMeasurement(
        {'appStartDuration': appStart['appStartDuration'], 'coldStart': 1},
        'app_startup'
      );
    }
  } catch (error) {
    log('Error getting app start metrics: $error');
  }
}
```

**Pattern**:
- Call native method when instrumentation initializes
- Native calculates duration on-demand (no early initialization needed!)
- Push measurement with duration value
- Simple error handling

### Analysis of Honeycomb's Implementation

Located at: `/Users/srsholmes/Work/junk/honeycomb-opentelemetry-react-native`

#### How Honeycomb Captures Startup Time

**iOS** (`ios/HoneycombReactNative.swift`):
```swift
private static var startTime: Date? = nil

@objc public static func optionsBuilder() -> HoneycombOptions.Builder {
    if startTime == nil {
        startTime = Date()  // Captured when first accessed
    }
    return HoneycombOptions.Builder()
}

@objc public static func getAppStartTime() -> Double {
    return startTime!.timeIntervalSince1970 * 1000.0
}
```

- Called from `AppDelegate.application(didFinishLaunchingWithOptions:)` **BEFORE** React Native initialization
- Uses static variable with lazy initialization
- Synchronous bridge method for immediate JavaScript access

**Android** (`android/.../HoneycombOpentelemetryReactNativeModule.kt`):
```kotlin
companion object {
    private var appStartTimeMillis = System.currentTimeMillis()  // Captured at class load

    fun configure(app: Application, builder: HoneycombOptions.Builder) {
        // Called from MainApplication.onCreate() BEFORE super.onCreate()
    }
}

override fun getAppStartTime(): Double {
    return appStartTimeMillis.toDouble()
}
```

- Companion object property captures time at class initialization
- `configure()` called from `MainApplication.onCreate()` **BEFORE** `super.onCreate()`
- Synchronous bridge method

#### JavaScript Bridge

**File**: `src/ReactNativeStartupInstrumentation.tsx`

```typescript
export class ReactNativeStartupInstrumentation extends InstrumentationBase {
  public setTracerProvider(tracerProvider: TracerProvider): void {
    super.setTracerProvider(tracerProvider);
    if (this._isEnabled) {
      this.sendAppStartTrace();
    }
  }

  sendAppStartTrace(): void {
    let startTime = HoneycombOpentelemetryReactNative.getAppStartTime();
    this.tracer.startSpan('react native startup', { startTime }).end();
  }
}
```

**Timing Flow**:
1. Native captures timestamp at app startup (before RN)
2. JavaScript bundle loads and executes
3. Honeycomb SDK initializes, tracer provider is set
4. `sendAppStartTrace()` retrieves native timestamp synchronously
5. Creates OpenTelemetry span from native start to current time

### React Native's Performance API - Reality Check

**Critical Finding**: React Native **does NOT provide a built-in startup timing API**.

After testing on React Native 0.82.1, the global `performance` object only provides:
- `performance.now()` - High-resolution timestamp
- `performance.mark(name)` - Create performance marks
- `performance.measure(name, startMark, endMark)` - Measure between marks

**There is NO `performance.rnStartupTiming` API** (despite various online references suggesting it exists).

This is why Honeycomb, Firebase Performance, New Relic, and all other RUM solutions use native modules to capture startup timing - there is no JavaScript-only alternative.

### Key Insights

1. **Use OS-level APIs instead of manual timestamps** - iOS `sysctl()` and Android `Process.getStartElapsedRealtime()` are more accurate
2. **No AppDelegate/MainActivity initialization needed** - OS already tracks process start time!
3. **Calculate on-demand** - Native method calculates duration when called, not stored beforehand
4. **Faro Flutter SDK approach is superior** - Simpler, more accurate, already Grafana-maintained
5. **Synchronous bridge methods** allow JavaScript to retrieve timing instantly
6. **React Native provides NO built-in startup timing API** - native module is the ONLY way

### Why Faro Flutter Approach is Better

| Aspect | Honeycomb Approach | **Faro Flutter Approach** |
|--------|-------------------|--------------------------|
| **iOS timing** | Manual `Date()` capture in AppDelegate | ✅ `sysctl()` queries kernel for process start |
| **Android timing** | Manual `System.currentTimeMillis()` in MainActivity | ✅ `Process.getStartElapsedRealtime()` from OS |
| **Setup required** | Must call `initialize()` in AppDelegate/MainActivity | ✅ **NO setup required** - OS tracks automatically |
| **Accuracy** | Subject to timing of initialization call | ✅ Accurate to actual process start |
| **Code complexity** | Static variables, lazy init, fallbacks | ✅ Simple calculation on-demand |
| **Grafana alignment** | Third-party solution | ✅ Already Grafana solution |

**Decision**: Use Faro Flutter SDK approach for React Native implementation.

---

## Implementation Plan

### Phase 1: Native Module Implementation (REQUIRED)

**Estimated Time**: 1-2 weeks
**Complexity**: Medium-High
**Value**: High - This is the ONLY way to measure JS bundle load time

**Why Native Module is Required**:
- Cannot measure JS load time from JavaScript (bundle already loaded when JS runs)
- Need to capture timestamp in native code BEFORE bundle loads
- Need to expose that timestamp to JavaScript AFTER bundle loads
- React Native provides NO built-in startup timing API
- This is exactly what Honeycomb does - it's not optional

#### 1.1 Create Native Module Structure

**New Files Required**:

**iOS**:
- `packages/react-native/ios/FaroReactNative.swift`
- `packages/react-native/ios/FaroReactNativeModule.mm`
- `packages/react-native/ios/FaroReactNativeModule.h`
- `packages/react-native/FaroReactNative.podspec`

**Android**:
- `packages/react-native/android/src/main/java/com/grafana/faro/reactnative/FaroReactNativeModule.kt`
- `packages/react-native/android/src/main/java/com/grafana/faro/reactnative/FaroReactNativePackage.kt`
- `packages/react-native/android/build.gradle`

#### 1.2 iOS Implementation (Faro Flutter Approach)

**File**: `packages/react-native/ios/FaroReactNative.swift`

```swift
import Foundation

@objc(FaroReactNative)
public class FaroReactNative: NSObject {

    /// Gets app startup duration in milliseconds using kernel process info
    /// This method queries the OS for the actual process start time, so no
    /// manual initialization or timestamp capture is needed.
    ///
    /// Returns duration from process start to current time in milliseconds
    @objc public static func getAppStartDuration() -> Double {
        var appStartDuration: Double = 0.0
        var kinfo = kinfo_proc()
        var size = MemoryLayout<kinfo_proc>.stride
        var mib: [Int32] = [CTL_KERN, KERN_PROC, KERN_PROC_PID, getpid()]
        sysctl(&mib, u_int(mib.count), &kinfo, &size, nil, 0)

        let start_time = kinfo.kp_proc.p_starttime
        var time: timeval = timeval(tv_sec: 0, tv_usec: 0)
        gettimeofday(&time, nil)

        let currentTimeMilliseconds = Double(Int64(time.tv_sec) * 1000) + Double(time.tv_usec) / 1000.0
        let processTimeMilliseconds = Double(Int64(start_time.tv_sec) * 1000) + Double(start_time.tv_usec) / 1000.0

        appStartDuration = (currentTimeMilliseconds - processTimeMilliseconds)

        return appStartDuration
    }
}
```

**Key Benefits**:
- ✅ No `initialize()` method needed - OS tracks process start automatically
- ✅ No AppDelegate modifications required
- ✅ Accurate to actual process start time from kernel
- ✅ Ported directly from working Faro Flutter SDK

**File**: `packages/react-native/ios/FaroReactNativeModule.h`

```objc
#import <React/RCTBridgeModule.h>

@interface FaroReactNativeModule : NSObject <RCTBridgeModule>
@end
```

**File**: `packages/react-native/ios/FaroReactNativeModule.mm`

```objc
#import "FaroReactNativeModule.h"
#import <React/RCTBridgeModule.h>
#import "FaroReactNative-Swift.h"

@implementation FaroReactNativeModule

RCT_EXPORT_MODULE(FaroReactNativeModule)

// Synchronous method for immediate access from JavaScript
// Returns app startup duration in milliseconds
RCT_EXPORT_BLOCKING_SYNCHRONOUS_METHOD(getAppStartDuration)
{
  return @([FaroReactNative getAppStartDuration]);
}

@end
```

**File**: `packages/react-native/FaroReactNative.podspec`

```ruby
require "json"

package = JSON.parse(File.read(File.join(__dir__, "package.json")))

Pod::Spec.new do |s|
  s.name         = "FaroReactNative"
  s.version      = package["version"]
  s.summary      = package["description"]
  s.homepage     = package["homepage"]
  s.license      = package["license"]
  s.authors      = package["author"]

  s.platforms    = { :ios => "13.4" }
  s.source       = { :git => "https://github.com/grafana/faro-web-sdk.git", :tag => "#{s.version}" }

  s.source_files = "ios/**/*.{h,m,mm,swift}"

  s.dependency "React-Core"

  s.pod_target_xcconfig = {
    "DEFINES_MODULE" => "YES",
    'SWIFT_COMPILATION_MODE' => 'wholemodule'
  }
end
```

#### 1.3 Android Implementation (Faro Flutter Approach)

**File**: `packages/react-native/android/src/main/java/com/grafana/faro/reactnative/FaroReactNativeModule.kt`

```kotlin
package com.grafana.faro.reactnative

import android.os.Build
import android.os.Process
import android.os.SystemClock
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.bridge.ReactContextBaseJavaModule
import com.facebook.react.bridge.ReactMethod

/**
 * Faro React Native native module for startup timing measurement
 *
 * Uses Android OS APIs to get accurate process start time without
 * requiring manual initialization or timestamp capture.
 */
class FaroReactNativeModule(reactContext: ReactApplicationContext) :
    ReactContextBaseJavaModule(reactContext) {

    companion object {
        const val NAME = "FaroReactNativeModule"
    }

    override fun getName(): String = NAME

    /**
     * Gets app startup duration in milliseconds using Android OS APIs
     *
     * Uses Process.getStartElapsedRealtime() which returns when the process
     * started, so no manual initialization is needed.
     *
     * Returns duration from process start to current time in milliseconds
     * Returns 0 if Android version < N (API 24)
     */
    @ReactMethod(isBlockingSynchronousMethod = true)
    fun getAppStartDuration(): Double {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.N) {
            val duration = SystemClock.elapsedRealtime() - Process.getStartElapsedRealtime()
            return duration.toDouble()
        }
        return 0.0
    }
}
```

**Key Benefits**:
- ✅ No `initialize()` method needed - OS tracks process start automatically
- ✅ No MainActivity modifications required
- ✅ Accurate to actual process start time from Android OS
- ✅ Ported directly from working Faro Flutter SDK
- ✅ Works on Android N+ (API 24+, ~99% of devices as of 2025)

**File**: `packages/react-native/android/src/main/java/com/grafana/faro/reactnative/FaroReactNativePackage.kt`

```kotlin
package com.grafana.faro.reactnative

import com.facebook.react.ReactPackage
import com.facebook.react.bridge.NativeModule
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.uimanager.ViewManager

class FaroReactNativePackage : ReactPackage {
    override fun createNativeModules(reactContext: ReactApplicationContext): List<NativeModule> {
        return listOf(FaroReactNativeModule(reactContext))
    }

    override fun createViewManagers(reactContext: ReactApplicationContext): List<ViewManager<*, *>> {
        return emptyList()
    }
}
```

**File**: `packages/react-native/android/build.gradle`

```gradle
buildscript {
    repositories {
        google()
        mavenCentral()
    }

    dependencies {
        classpath 'com.android.tools.build:gradle:7.4.2'
        classpath 'org.jetbrains.kotlin:kotlin-gradle-plugin:1.8.0'
    }
}

apply plugin: 'com.android.library'
apply plugin: 'kotlin-android'

android {
    compileSdkVersion 33

    defaultConfig {
        minSdkVersion 21
        targetSdkVersion 33
    }

    sourceSets {
        main {
            java.srcDirs = ['src/main/java']
        }
    }
}

repositories {
    google()
    mavenCentral()
}

dependencies {
    implementation 'com.facebook.react:react-native:+'
    implementation 'org.jetbrains.kotlin:kotlin-stdlib:1.8.0'
}
```

#### 1.4 Create StartupInstrumentation Class (JavaScript)

**File**: `packages/react-native/src/instrumentations/startup/index.ts`

```typescript
import { BaseInstrumentation, VERSION } from '@grafana/faro-core';
import { NativeModules } from 'react-native';

const { FaroReactNativeModule } = NativeModules;

export interface StartupInstrumentationOptions {
  enabled?: boolean;
}

/**
 * Measures React Native app startup time from process start to Faro SDK init
 *
 * Uses native OS APIs to get accurate startup timing:
 * - iOS: sysctl() to query kernel for process start time
 * - Android: Process.getStartElapsedRealtime() from Android OS
 *
 * NO native initialization required - OS tracks process start automatically!
 *
 * Captures:
 * - Total startup duration (process start to Faro init)
 *   - Includes: Native init, RN runtime, JS bundle load, JS execution, Faro init
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
    this.captureStartupMetrics();
  }

  private captureStartupMetrics(): void {
    try {
      // Get startup duration from native module
      if (!FaroReactNativeModule?.getAppStartDuration) {
        this.logWarn(
          'Native module not available. Startup instrumentation requires native module. ' +
          'Run `cd ios && pod install` and rebuild the app.'
        );
        return;
      }

      // Call native method to get duration (calculated on-demand by OS APIs)
      const appStartDuration = FaroReactNativeModule.getAppStartDuration();

      if (appStartDuration === 0) {
        this.logWarn(
          'App startup duration is 0. This may indicate unsupported Android version (< API 24) ' +
          'or an issue with the native module.'
        );
        return;
      }

      const values: Record<string, number> = {
        // Total time from process start to Faro init
        // Includes: native init + RN runtime + JS bundle load + JS execution + Faro init
        total_duration_ms: appStartDuration,
      };

      // Calculate approximate process start time for timestamp
      const processStartTime = Date.now() - appStartDuration;

      this.api.pushMeasurement(
        { type: 'app_startup', values },
        {
          skipDedupe: true,
          timestamp: new Date(processStartTime).toISOString(),
        }
      );

      this.logInfo('Startup metrics captured successfully', {
        duration: `${appStartDuration}ms`,
      });
    } catch (error) {
      this.logError('Failed to capture startup metrics', error);
    }
  }

  unpatch(): void {
    // No cleanup needed
  }
}
```

**Key Benefits vs Honeycomb Approach**:
- ✅ No `markAppStart()` or manual timestamp capture
- ✅ No AppDelegate/MainActivity initialization code required
- ✅ Simpler JavaScript code - just call native method once
- ✅ OS handles all timing automatically

#### 1.5 User Setup Documentation

Add to README.md:

````markdown
### Startup Performance Measurement

The Startup Instrumentation measures app launch time from process start to Faro SDK initialization using native OS APIs.

**Key Features**:
- ✅ **NO AppDelegate/MainActivity setup required** - OS tracks process start automatically!
- ✅ Uses iOS `sysctl()` and Android `Process.getStartElapsedRealtime()` for accurate timing
- ✅ Ported from working Faro Flutter SDK implementation
- ✅ Simple installation - just install native module and rebuild

**Metrics Captured**:

| Metric | Description |
|--------|-------------|
| `total_duration_ms` | Total time from process start to Faro init (includes native init, RN runtime, JS bundle load, JS execution, Faro init) |

**Requirements**:
- iOS 13.4+ (any iOS that supports React Native)
- Android API 24+ (Android 7.0 Nougat, ~99% of devices as of 2025)

#### Installation

**iOS**:
```bash
cd ios && pod install
```

**Android**:
No additional setup needed - Gradle handles it automatically.

**Rebuild**:
```bash
# iOS
yarn ios

# Android
yarn android
```

#### Usage

```tsx
import { initializeFaro, getRNInstrumentations } from '@grafana/faro-react-native';

initializeFaro({
  url: 'https://your-collector-url',
  app: { name: 'my-app' },
  instrumentations: [
    ...getRNInstrumentations({
      trackStartup: true, // Enabled by default
    }),
  ],
});
```

**That's it!** No AppDelegate or MainActivity changes needed.

#### Verification

Check logs for:
- ✅ Success: `"Startup metrics captured successfully"` with duration in ms
- ⚠️ Warning: `"Native module not available"` - run `pod install` and rebuild
- ⚠️ Warning: `"App startup duration is 0"` - Android version < API 24 (unsupported)

#### Viewing Metrics in Grafana

```logql
# Average startup time
{app_name="my-app", kind="measurement"}
| json
| type="app_startup"
| unwrap total_duration_ms
| stats avg

# 95th percentile
{app_name="my-app", kind="measurement"}
| json
| type="app_startup"
| unwrap total_duration_ms
| quantile_over_time(0.95)
```
````

---

## Testing Strategy

### Unit Tests

**File**: `packages/react-native/src/instrumentations/startup/startup.test.ts`

```typescript
import { StartupInstrumentation } from './index';
import { mockFaroInstance } from '@grafana/faro-core/testing';

describe('StartupInstrumentation', () => {
  let instrumentation: StartupInstrumentation;
  let mockFaro: ReturnType<typeof mockFaroInstance>;

  beforeEach(() => {
    mockFaro = mockFaroInstance();
    instrumentation = new StartupInstrumentation();
    instrumentation.setFaro(mockFaro);
  });

  describe('with rnStartupTiming available', () => {
    beforeEach(() => {
      (global as any).performance = {
        rnStartupTiming: {
          startTime: 1000,
          initializeRuntimeStart: 1100,
          initializeRuntimeEnd: 1200,
          executeJavaScriptBundleEntryPointStart: 1300,
          executeJavaScriptBundleEntryPointEnd: 1500,
        },
      };

      // Mock Date.now
      jest.spyOn(Date, 'now').mockReturnValue(2000);
    });

    it('should capture startup metrics', () => {
      instrumentation.initialize();

      expect(mockFaro.api.pushMeasurement).toHaveBeenCalledWith(
        {
          type: 'app_startup',
          values: {
            total_duration_ms: 1000, // 2000 - 1000
            runtime_init_duration_ms: 100, // 1200 - 1100
            js_bundle_execution_ms: 200, // 1500 - 1300
            faro_init_overhead_ms: 500, // 2000 - 1500
          },
        },
        {
          skipDedupe: true,
          timestamp: new Date(1000).toISOString(),
        }
      );
    });

    it('should log success message', () => {
      instrumentation.initialize();

      expect(mockFaro.internalLogger.info).toHaveBeenCalledWith(
        expect.stringContaining('Startup metrics captured')
      );
    });
  });

  describe('without rnStartupTiming', () => {
    beforeEach(() => {
      (global as any).performance = undefined;
    });

    it('should log warning', () => {
      instrumentation.initialize();

      expect(mockFaro.internalLogger.warn).toHaveBeenCalledWith(
        expect.stringContaining('Startup timing not available')
      );
    });

    it('should not push measurement', () => {
      instrumentation.initialize();

      expect(mockFaro.api.pushMeasurement).not.toHaveBeenCalled();
    });
  });

  describe('with missing timing values', () => {
    beforeEach(() => {
      (global as any).performance = {
        rnStartupTiming: {
          startTime: null,
        },
      };
    });

    it('should handle gracefully', () => {
      instrumentation.initialize();

      expect(mockFaro.internalLogger.warn).toHaveBeenCalled();
      expect(mockFaro.api.pushMeasurement).not.toHaveBeenCalled();
    });
  });
});
```

### Integration Tests (Demo App)

**File**: `demo-react-native/src/screens/StartupMetricsScreen.tsx`

```tsx
import React, { useEffect, useState } from 'react';
import { View, Text, ScrollView, StyleSheet, NativeModules, Platform } from 'react-native';

const { FaroReactNativeModule } = NativeModules;

interface StartupMetrics {
  available: boolean;
  startupDuration?: number;
  processStartTime?: number;
}

export function StartupMetricsScreen() {
  const [metrics, setMetrics] = useState<StartupMetrics>({ available: false });
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    try {
      if (!FaroReactNativeModule?.getAppStartDuration) {
        setError('Native module not available. Run `pod install` and rebuild.');
        return;
      }

      // Get startup duration calculated by OS APIs
      const startupDuration = FaroReactNativeModule.getAppStartDuration();

      if (startupDuration === 0) {
        if (Platform.OS === 'android') {
          setError('Android API 24+ required (you may be on an older version)');
        } else {
          setError('Unable to get startup duration from native module');
        }
        return;
      }

      const now = Date.now();
      const processStartTime = now - startupDuration;

      setMetrics({
        available: true,
        startupDuration,
        processStartTime,
      });
    } catch (err) {
      console.error('Failed to get startup metrics:', err);
      setError(`Error: ${err instanceof Error ? err.message : 'Unknown error'}`);
    }
  }, []);

  if (error) {
    return (
      <View style={styles.container}>
        <Text style={styles.errorTitle}>Startup Metrics Unavailable</Text>
        <Text style={styles.error}>{error}</Text>
        <Text style={styles.info}>
          {'\n'}This feature uses native OS APIs:{'\n'}
          • iOS: sysctl() for kernel process info{'\n'}
          • Android: Process.getStartElapsedRealtime(){'\n'}
          {'\n'}No AppDelegate/MainActivity setup required!
        </Text>
      </View>
    );
  }

  if (!metrics.available) {
    return (
      <View style={styles.container}>
        <Text style={styles.info}>Loading...</Text>
      </View>
    );
  }

  return (
    <ScrollView style={styles.container}>
      <Text style={styles.title}>App Startup Metrics</Text>

      <View style={styles.metric}>
        <Text style={styles.label}>Total Startup Duration</Text>
        <Text style={styles.value}>{metrics.startupDuration}ms</Text>
        <Text style={styles.description}>
          From process start to this screen load{'\n'}
          Includes: Native init + RN runtime + JS load + JS exec + Faro init
        </Text>
      </View>

      <View style={styles.metric}>
        <Text style={styles.label}>Process Start Time</Text>
        <Text style={styles.value}>{new Date(metrics.processStartTime!).toLocaleTimeString()}</Text>
        <Text style={styles.description}>
          Calculated from OS process info (no manual timestamp capture!)
        </Text>
      </View>

      <View style={styles.metric}>
        <Text style={styles.label}>Platform</Text>
        <Text style={styles.value}>{Platform.OS === 'ios' ? 'iOS' : 'Android'}</Text>
        <Text style={styles.description}>
          {Platform.OS === 'ios'
            ? 'Using sysctl() to query kernel'
            : 'Using Process.getStartElapsedRealtime()'}
        </Text>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 16, backgroundColor: '#f5f5f5' },
  title: { fontSize: 24, fontWeight: 'bold', marginBottom: 24, color: '#333' },
  metric: {
    marginBottom: 20,
    padding: 16,
    backgroundColor: 'white',
    borderRadius: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  label: { fontSize: 12, color: '#666', textTransform: 'uppercase', marginBottom: 4 },
  value: { fontSize: 28, fontWeight: 'bold', color: '#007AFF', marginBottom: 8 },
  description: { fontSize: 13, color: '#999', lineHeight: 18 },
  errorTitle: { fontSize: 20, fontWeight: 'bold', color: '#FF3B30', marginBottom: 12 },
  error: { fontSize: 16, color: '#FF3B30', marginBottom: 8 },
  info: { fontSize: 14, color: '#666', lineHeight: 20 },
});
```

### Manual Testing Checklist

- [ ] **Native Module Setup**:
  - [ ] iOS native module initializes correctly
  - [ ] Android native module initializes correctly
  - [ ] Pod install succeeds without errors
  - [ ] Gradle build succeeds without errors
  - [ ] Native module linked correctly

- [ ] **Functionality**:
  - [ ] Startup metrics captured on iOS
  - [ ] Startup metrics captured on Android
  - [ ] Metrics visible in console logs
  - [ ] Metrics sent to Faro collector
  - [ ] Queryable in Grafana/Loki
  - [ ] Cold start captured correctly
  - [ ] Timing values are reasonable (not negative, not absurdly large)

- [ ] **Error Handling**:
  - [ ] Graceful error if native module not initialized
  - [ ] Clear error messages in logs
  - [ ] No crashes if native module missing

- [ ] **Platform Testing**:
  - [ ] Works on iOS simulator
  - [ ] Works on Android emulator
  - [ ] Works on iOS real device
  - [ ] Works on Android real device
  - [ ] Metrics consistent between iOS and Android

- [ ] **Performance**:
  - [ ] No memory leaks
  - [ ] Minimal performance overhead (< 10ms)
  - [ ] No impact on app startup time

---

## Rollout Plan

### Week 1-2: Native Module Implementation
**Tasks**:
- [ ] Implement iOS native module (Swift + Objective-C++ bridge)
- [ ] Implement Android native module (Kotlin)
- [ ] Create podspec for iOS
- [ ] Configure build.gradle for Android
- [ ] Test pod install on iOS
- [ ] Test gradle build on Android
- [ ] Verify timing capture works on both platforms
- [ ] Test synchronous bridge methods work

**Deliverable**: Working native modules that capture app start time

**Success Criteria**:
- `pod install` succeeds in demo app
- Android gradle build succeeds
- Native methods callable from JavaScript
- Timing captured before JS bundle loads
- Timestamp is accurate and reasonable

### Week 2: JavaScript Instrumentation
**Tasks**:
- [ ] Create StartupInstrumentation class
- [ ] Integrate with native module via NativeModules
- [ ] Add to getRNInstrumentations with trackStartup option
- [ ] Export from package index
- [ ] Write comprehensive unit tests
- [ ] Handle missing native module gracefully with clear error
- [ ] Add TypeScript types

**Deliverable**: Working startup metrics instrumentation

**Success Criteria**:
- All tests pass
- Metrics pushed to Faro collector
- Clear error message if native module missing
- Single metric: total_duration_ms
- Event sent with correct timestamp

### Week 2-3: Documentation & Demo
**Tasks**:
- [ ] Update README with native setup instructions
- [ ] Update FEATURE_PARITY documentation
- [ ] Add StartupMetricsScreen to demo app
- [ ] Update demo app iOS AppDelegate with FaroReactNative.initialize()
- [ ] Update demo app Android MainApplication with FaroReactNativeModule.initialize()
- [ ] Test on iOS simulator and device
- [ ] Test on Android emulator and device
- [ ] Create Grafana/Loki query examples
- [ ] Write troubleshooting guide

**Deliverable**: Complete documentation and working demo

**Success Criteria**:
- Demo app shows startup metrics
- Documentation is clear and complete
- Native setup instructions are step-by-step
- Grafana queries work
- Troubleshooting guide covers common issues

---

## Success Metrics

1. **Accuracy**: Startup timing within 50ms of actual measurement
2. **Coverage**: Works on all React Native versions with native module support
3. **Reliability**: Zero crashes, graceful error handling if native module missing
4. **Adoption**: Available via getRNInstrumentations with opt-in (requires native setup)
5. **Visibility**: Metrics queryable in Grafana/Loki within seconds of app launch

**KPIs**:
- Time to first metric: < 5 seconds after app start
- Error rate: < 0.1%
- Performance overhead: < 10ms added to startup time
- Native module setup time: < 5 minutes per platform

---

## Risks & Mitigations

| Risk | Impact | Mitigation |
|------|--------|-----------|
| Native module build complexity | High | Follow Honeycomb pattern, extensive testing, clear setup docs |
| CocoaPods integration issues | Medium | Follow RN best practices, troubleshooting guide |
| Gradle build failures | Medium | Test on multiple RN versions, document requirements |
| Yarn monorepo build issues | Medium | Follow existing patterns in repo, test incremental builds |
| Timing inaccuracy | High | Validate against Firebase/New Relic benchmarks |
| Users forget native setup | High | Clear error messages, prominent docs, setup validation |
| Breaking changes in RN bridge API | Low | Monitor RN changelog, test on multiple RN versions |

---

## Files to Create/Modify

### New Files (Native Module)
- `packages/react-native/ios/FaroReactNative.swift` - iOS timing capture
- `packages/react-native/ios/FaroReactNativeModule.h` - Objective-C header
- `packages/react-native/ios/FaroReactNativeModule.mm` - Bridge implementation
- `packages/react-native/FaroReactNative.podspec` - CocoaPods spec
- `packages/react-native/android/src/main/java/com/grafana/faro/reactnative/FaroReactNativeModule.kt` - Android module
- `packages/react-native/android/src/main/java/com/grafana/faro/reactnative/FaroReactNativePackage.kt` - Package registration
- `packages/react-native/android/build.gradle` - Android build config

### New Files (JavaScript)
- `packages/react-native/src/instrumentations/startup/index.ts` - Instrumentation class
- `packages/react-native/src/instrumentations/startup/types.ts` - TypeScript types
- `packages/react-native/src/instrumentations/startup/startup.test.ts` - Unit tests
- `demo-react-native/src/screens/StartupMetricsScreen.tsx` - Demo screen

### Modified Files
- `packages/react-native/src/index.ts` - Add exports
- `packages/react-native/src/config/getRNInstrumentations.ts` - Add trackStartup option
- `packages/react-native/README.md` - Add documentation with native setup
- `packages/react-native/FEATURE_PARITY.md` - Update status
- `packages/react-native/package.json` - Add build scripts if needed
- `demo-react-native/ios/FaroRNDemo/AppDelegate.swift` - Add native initialization
- `demo-react-native/android/app/src/main/java/.../MainApplication.kt` - Add native initialization
- `demo-react-native/src/navigation/AppNavigator.tsx` - Add route

---

## Recommendation

**Use Faro Flutter SDK approach** - port the existing, working Grafana solution to React Native.

### Why Faro Flutter Approach is Superior

| Advantage | Details |
|-----------|---------|
| **Already Grafana** | Same team, same architecture, maintainer available for consultation |
| **Simpler implementation** | Uses OS APIs instead of manual timestamp capture |
| **More accurate** | Queries kernel/OS for actual process start time |
| **No setup required** | No AppDelegate/MainActivity initialization needed |
| **Battle-tested** | Already shipping in production Flutter apps |
| **Easier for users** | Just `pod install` and rebuild - no code changes |

### Comparison

| Aspect | Honeycomb | **Faro Flutter (Recommended)** |
|--------|-----------|-------------------------------|
| **iOS Implementation** | Manual `Date()` in AppDelegate | ✅ `sysctl()` queries kernel |
| **Android Implementation** | Manual timestamp in MainActivity | ✅ `Process.getStartElapsedRealtime()` |
| **User Setup Required** | Must add code to AppDelegate/MainActivity | ✅ **NONE** - just install and rebuild |
| **Timing Accuracy** | Depends on when `initialize()` called | ✅ OS-accurate to process start |
| **Code Complexity** | Static vars, lazy init, fallbacks | ✅ Simple on-demand calculation |
| **Grafana Alignment** | Third-party | ✅ Internal Grafana solution |

### Implementation Approach

1. **Port Faro Flutter code** directly to React Native (Swift/Kotlin → Swift/Kotlin)
2. **Use same pattern**: On-demand calculation via synchronous bridge method
3. **Leverage Grafana expertise**: Reach out to Flutter SDK maintainer if needed
4. **Keep it simple**: Single method call, single metric
5. **User-friendly**: Zero setup code required from users

---

## Next Steps

1. **Review this plan** with the team
2. **Approve implementation scope**
3. **Create GitHub issues** for implementation tasks
4. **Assign implementation** to developer
5. **Set milestone** for completion (2-3 weeks)
6. **Plan demo** for internal review with working iOS and Android apps

---

## References

- Honeycomb Implementation: `/Users/srsholmes/Work/junk/honeycomb-opentelemetry-react-native`
- React Native Performance API: https://reactnative.dev/docs/performance
- React Native Startup: https://medium.com/@imranrafeek/demystifying-react-native-a-deep-dive-into-the-startup-lifecycle-3516734669e9
- Shopify's RN Performance: https://shopify.github.io/react-native-performance/
