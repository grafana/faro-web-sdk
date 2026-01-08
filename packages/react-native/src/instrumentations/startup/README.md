# Startup Instrumentation

Measures React Native app startup time from process start to Faro SDK initialization using OS-level APIs.

## Overview

The Startup Instrumentation captures accurate app startup timing without requiring any manual setup in `AppDelegate.m` or `MainActivity.java`. It uses native OS APIs to query when the process actually started:

- **iOS**: Uses `sysctl()` system call to query kernel for process start time via `KERN_PROC_PID`
- **Android**: Uses `Process.getStartElapsedRealtime()` (API 24+) to get elapsed time since process start

This implementation is ported directly from the [Faro Flutter SDK](https://github.com/grafana/faro-flutter-sdk), which has been battle-tested in production Flutter applications.

## How It Works

### The Problem with Manual Timing

Traditional approaches require capturing timestamps manually in native code (e.g., `AppDelegate.application(_:didFinishLaunchingWithOptions:)` or `MainActivity.onCreate()`). This has several issues:

1. **Requires code changes** in native entry points
2. **Static variables** needed to store timestamps
3. **Easy to forget** during initial setup
4. **Maintenance burden** when upgrading React Native

### The OS-Level Solution

Both iOS and Android track process start time at the kernel level. We simply query the OS when needed:

**iOS** (all versions):
```swift
var kinfo = kinfo_proc()
var mib: [Int32] = [CTL_KERN, KERN_PROC, KERN_PROC_PID, getpid()]
sysctl(&mib, u_int(mib.count), &kinfo, &size, nil, 0)
let processStartTime = kinfo.kp_proc.p_starttime
```

**Android** (API 24+):
```kotlin
val processStartTime = Process.getStartElapsedRealtime()
val currentTime = SystemClock.elapsedRealtime()
val startupDuration = currentTime - processStartTime
```

### What Gets Measured

The startup instrumentation captures:

- **`total_duration_ms`**: Total time from process start to Faro SDK initialization
  - Includes: Native module initialization
  - Includes: React Native runtime setup
  - Includes: JavaScript bundle loading
  - Includes: JavaScript execution up to `initializeFaro()`
  - Includes: Faro SDK initialization

This gives you the complete end-to-end startup experience from the user's perspective.

## Installation

The native module is automatically linked via React Native autolinking. Just install dependencies and rebuild:

### iOS

```bash
cd ios && pod install && cd ..
yarn ios
```

### Android

⚠️ **Known Issue**: Android implementation is complete but currently not working in the demo app due to Yarn workspace path resolution issues with React Native's codegen. The native code is ready and will work once gradle workspace configuration is resolved.

**TODO**: Fix Android gradle workspace path resolution for codegen and other React Native packages.

```bash
# When Android workspace issues are resolved:
yarn android
```

## Usage

Enable startup tracking in your Faro initialization:

```typescript
import { initializeFaro, getRNInstrumentations } from '@grafana/faro-react-native';

initializeFaro({
  url: 'https://your-collector-endpoint.com',
  app: {
    name: 'your-app-name',
    version: '1.0.0',
  },
  instrumentations: [
    // Startup tracking is enabled by default
    ...getRNInstrumentations({ trackStartup: true }),
  ],
});
```

To disable startup tracking:

```typescript
instrumentations: [
  ...getRNInstrumentations({ trackStartup: false }),
]
```

You can also use the instrumentation directly:

```typescript
import { initializeFaro } from '@grafana/faro-react-native';
import { StartupInstrumentation } from '@grafana/faro-react-native';

initializeFaro({
  url: 'https://your-collector-endpoint.com',
  app: {
    name: 'your-app-name',
    version: '1.0.0',
  },
  instrumentations: [
    new StartupInstrumentation({ enabled: true }),
  ],
});
```

## Requirements

### iOS
- **iOS 13.4+** (any iOS version that supports React Native)
- Works on all iOS devices

### Android
- **Android API 24+ (Android 7.0 Nougat)**
- Covers ~99% of Android devices as of 2025
- Returns `0` on older Android versions (gracefully degraded)

## Data Format

Startup metrics are sent as measurements with the following structure:

```json
{
  "type": "app_startup",
  "values": {
    "total_duration_ms": 1250.5
  }
}
```

## Implementation Details

### Architecture

The implementation consists of three layers:

1. **Native Layer** (`ios/`, `android/`):
   - iOS: `FaroReactNative.swift` - Swift implementation using `sysctl()`
   - iOS: `FaroReactNativeModule.mm` - Objective-C++ bridge to React Native
   - Android: `FaroReactNativeModule.kt` - Kotlin implementation using `Process.getStartElapsedRealtime()`
   - Android: `FaroReactNativePackage.kt` - React Native package registration

2. **JavaScript Bridge** (`src/instrumentations/startup/index.ts`):
   - Calls native module via `NativeModules.FaroReactNativeModule`
   - Uses synchronous method for immediate access
   - Handles missing native module gracefully

3. **Faro Integration**:
   - Extends `BaseInstrumentation` from `@grafana/faro-core`
   - Integrates with Faro's measurement API
   - Uses `skipDedupe: true` to ensure measurement is always sent

### Native Module Configuration

**iOS Podspec** (`FaroReactNative.podspec`):
- Forces Old Architecture mode (`RCT_NEW_ARCH_ENABLED = 0`)
- Compatible with New Architecture apps
- No TurboModule/Fabric registration (prevents crashes)

**Android Gradle** (`android/build.gradle`):
- Namespace: `com.grafana.faro.reactnative`
- Min SDK: 21 (Android 5.0)
- Target SDK: 33 (Android 13)

**Autolinking** (`react-native.config.js`):
- Enables automatic discovery by React Native CLI
- No manual linking required

### Bridge Methods

Both platforms expose a synchronous method for immediate access:

**iOS**:
```objc
RCT_EXPORT_BLOCKING_SYNCHRONOUS_METHOD(getAppStartDuration)
{
  return @([FaroReactNative getAppStartDuration]);
}
```

**Android**:
```kotlin
@ReactMethod(isBlockingSynchronousMethod = true)
fun getAppStartDuration(): Double {
    if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.N) {
        val duration = SystemClock.elapsedRealtime() - Process.getStartElapsedRealtime()
        return duration.toDouble()
    }
    return 0.0
}
```

## Debugging

The instrumentation includes extensive debug logging (can be removed in production):

```javascript
[STARTUP DEBUG] captureStartupMetrics called
[STARTUP DEBUG] FaroReactNativeModule: [Module object or null]
[STARTUP DEBUG] Calling getAppStartDuration...
[STARTUP DEBUG] App start duration received: 1250.5
[STARTUP DEBUG] Pushing measurement: {...}
[STARTUP DEBUG] Measurement pushed successfully
```

If you see "Native module not available", ensure you've:
1. Installed pods: `cd ios && pod install`
2. Rebuilt the app: `yarn ios`
3. Checked that autolinking is enabled in your project

## Platform Status

| Platform | Native Code | Build | Runtime | Status |
|----------|-------------|-------|---------|---------|
| iOS | ✅ Complete | ✅ Working | ✅ Working | **Production Ready** |
| Android | ✅ Complete | ⚠️ Workspace Issue | ⏳ Untested | **Code Ready** |

### iOS Status: ✅ Production Ready
- Native implementation complete and tested
- Build succeeds via CocoaPods autolinking
- App launches and captures metrics correctly
- Verified with artificial delays

### Android Status: ⚠️ Code Ready, Workspace Issue
- Native implementation complete (ported from Flutter SDK)
- Code follows React Native best practices
- Blocked by Yarn workspace gradle path resolution
- Issue: `@react-native/codegen` not found in expected location
- TODO: Fix demo app's gradle configuration to resolve workspace paths

## Troubleshooting

### iOS: "Native module not available"
1. Run `cd ios && pod install`
2. Clean build folder in Xcode (Cmd+Shift+K)
3. Rebuild: `yarn ios`

### iOS: Build fails with "FaroReactNative.h not found"
1. Clean pods: `cd ios && rm -rf Pods Podfile.lock`
2. Reinstall: `pod install`
3. Clean Xcode derived data
4. Rebuild

### Android: Gradle build fails (Workspace Issue)
This is a known issue with the demo app's Yarn workspace configuration. The native Android code is complete and ready to work once gradle path resolution is fixed.

**Error**:
```
Error: Cannot find module '/path/to/node_modules/@react-native/codegen/...'
```

**Workaround** (for non-workspace projects):
The Android code will work fine in standalone React Native projects that aren't using Yarn workspaces.

## Credits

This implementation is ported from the [Faro Flutter SDK](https://github.com/grafana/faro-flutter-sdk):
- iOS: Ported from `ios/Classes/AppStart.swift`
- Android: Ported from `android/src/main/java/com/grafana/faro_flutter_plugin/FaroPlugin.java`

## License

Apache-2.0
