# @grafana/faro-react-native

Grafana Faro React Native SDK - Real User Monitoring for React Native applications.

## Installation

```bash
npm install @grafana/faro-react-native
# or
yarn add @grafana/faro-react-native
```

## Quick Start

```tsx
import { initializeFaro, getRNInstrumentations } from '@grafana/faro-react-native';

// Initialize Faro in your app entry point (e.g., App.tsx or index.js)
initializeFaro({
  url: 'https://faro-collector-prod-YOUR-REGION.grafana.net/collect/YOUR_TOKEN_HERE',
  app: {
    name: 'your-app-name',
    version: '1.0.0',
  },
  instrumentations: getRNInstrumentations({
    captureConsole: true,
    captureErrors: true,
    trackSessions: true,
    trackViews: true,
    trackAppState: true,
    trackUserActions: true,
  }),
});
```

## Features

### Core Instrumentations

- **Console Instrumentation** - Captures console logs, warnings, and errors
- **Errors Instrumentation** - Captures unhandled errors and promise rejections
- **Session Instrumentation** - Tracks user sessions
- **View Instrumentation** - Tracks screen/route changes
- **App State Instrumentation** - Tracks when app goes to background/foreground
- **User Actions Instrumentation** - Tracks user interactions with components
- **Performance Instrumentation** - Monitors CPU usage, memory usage, and app startup time using native OS APIs
- **Startup Instrumentation** - Automatically tracks app startup duration from process start
- **HTTP Instrumentation** - Tracks HTTP requests and correlates them with user actions

### React Integration

- **Error Boundary** - Catch and report React component errors with `FaroErrorBoundary`

### Tracking User Actions

The SDK provides intelligent user action tracking with:

- **Intelligent Duration Tracking**: Automatically determines when actions complete
- **HTTP Request Correlation**: Tracks HTTP requests triggered by user actions
- **Automatic Lifecycle Management**: No manual `end()` calls needed with HOC
- **Halt State**: Waits for pending async operations before ending actions

#### 1. Using the HOC (Higher-Order Component) - Recommended

Wrap your touchable components with `withFaroUserAction` for automatic tracking:

```tsx
import { TouchableOpacity, Text } from 'react-native';
import { withFaroUserAction } from '@grafana/faro-react-native';

// Create a tracked button component
const TrackedButton = withFaroUserAction(TouchableOpacity, 'submit_form');

function MyForm() {
  return (
    <TrackedButton onPress={handleSubmit}>
      <Text>Submit</Text>
    </TrackedButton>
  );
}
```

**Automatic Features:**

- User action starts on press
- HTTP requests triggered by the action are automatically correlated
- Action ends ~100ms after the last activity (HTTP request completion)
- If HTTP requests are pending, enters "halt" state and waits up to 10 seconds
- No manual `end()` call required!

You can override the action name and add context per instance:

```tsx
<TrackedButton
  onPress={handleSubmit}
  faroActionName="custom_action_name"
  faroContext={{ formType: 'contact', userId: '123' }}
>
  <Text>Submit</Text>
</TrackedButton>
```

**Example with HTTP:**

```tsx
const TrackedButton = withFaroUserAction(TouchableOpacity, 'load_data');

function DataLoader() {
  const handleLoad = async () => {
    // This HTTP request will be correlated with the user action
    // The action will wait for this to complete before ending
    const response = await fetch('https://api.example.com/data');
    const data = await response.json();
    setData(data);
  };

  return (
    <TrackedButton onPress={handleLoad}>
      <Text>Load Data</Text>
    </TrackedButton>
  );
}
```

#### 2. Using Manual Tracking

For complex workflows where you need explicit control:

```tsx
import { trackUserAction } from '@grafana/faro-react-native';

function handleComplexAction() {
  const action = trackUserAction('complex_workflow', {
    step: '1',
    userId: '123',
  });

  // Do your work...
  await performSomeWork();

  // Manually end the action when done
  // Note: With HOC, this is automatic!
  action?.end();
}
```

#### How Intelligent Duration Tracking Works

1. **User Action Starts**: When button is pressed or `trackUserAction()` is called
2. **Monitor Activity**: Tracks HTTP requests started during the action
3. **Detect Completion**:
   - If no HTTP requests: Ends after ~100ms
   - If HTTP requests pending: Enters "halt" state
4. **Wait for HTTP**: Action stays in halt state until all HTTP requests complete
5. **Auto-End**: Once all activity stops, action automatically ends
6. **Timeout**: If pending operations take too long (>10s), action forcibly ends

**Benefits:**

- Accurate action duration including async operations
- Correlate errors/events with the user action that triggered them
- Better understanding of user flows and performance
- No need to manually manage action lifecycle

### User Identification

Associate telemetry data with specific users:

```tsx
import { faro } from '@grafana/faro-react-native';

faro.api.setUser({
  id: 'user-123',
  username: 'john_doe',
  email: 'john@example.com',
  attributes: {
    plan: 'premium',
    signupDate: '2024-01-01',
  },
});
```

### Custom Events

Track custom business events:

```tsx
import { faro } from '@grafana/faro-react-native';

faro.api.pushEvent('purchase_completed', {
  productId: 'abc123',
  amount: '99.99',
  currency: 'USD',
});
```

### Performance Measurements

Track performance metrics:

```tsx
import { faro } from '@grafana/faro-react-native';

const startTime = Date.now();
await performHeavyOperation();
const duration = Date.now() - startTime;

faro.api.pushMeasurement({
  type: 'heavy_operation',
  values: {
    duration,
  },
});
```

### Manual Error Tracking

Report errors manually:

```tsx
import { faro } from '@grafana/faro-react-native';

try {
  await riskyOperation();
} catch (error) {
  faro.api.pushError(error, {
    context: {
      operation: 'riskyOperation',
      userId: '123',
    },
  });
}
```

### React Error Boundary

Catch and report React component errors automatically with Faro's Error Boundary:

#### Using the Component

```tsx
import { FaroErrorBoundary } from '@grafana/faro-react-native';
import { Text, View } from 'react-native';

function App() {
  return (
    <FaroErrorBoundary fallback={<Text>Something went wrong</Text>}>
      <YourApp />
    </FaroErrorBoundary>
  );
}
```

#### Using the HOC

```tsx
import { withFaroErrorBoundary } from '@grafana/faro-react-native';
import { Text } from 'react-native';

const MyComponent = () => <Text>Hello</Text>;

export default withFaroErrorBoundary(MyComponent, {
  fallback: <Text>Error occurred</Text>,
});
```

#### Advanced Configuration

```tsx
import { FaroErrorBoundary } from '@grafana/faro-react-native';

function App() {
  return (
    <FaroErrorBoundary
      // Static fallback UI
      fallback={<ErrorScreen />}

      // OR: Dynamic fallback with error details and reset function
      fallback={(error, resetError) => (
        <View>
          <Text>Error: {error.message}</Text>
          <Button title="Try Again" onPress={resetError} />
        </View>
      )}

      // Modify error before it's sent to Faro
      beforeCapture={(error) => {
        console.log('About to capture:', error);
      }}

      // React to errors
      onError={(error) => {
        console.error('Error caught:', error);
      }}

      // Lifecycle hooks
      onMount={() => console.log('Error boundary mounted')}
      onUnmount={(error) => console.log('Unmounting, had error:', error)}
      onReset={(error) => console.log('Resetting from error:', error)}

      // Pass additional options to faro.api.pushError
      pushErrorOptions={{
        context: {
          screen: 'HomeScreen',
        },
      }}
    >
      <YourApp />
    </FaroErrorBoundary>
  );
}
```

**Error Boundary Props:**

| Prop | Type | Description |
|------|------|-------------|
| `fallback` | `ReactElement \| (error, reset) => ReactElement` | UI to show when an error occurs. Can be static or a render function. |
| `beforeCapture` | `(error: Error) => void` | Called before error is sent to Faro. Use to modify or inspect the error. |
| `onError` | `(error: Error) => void` | Called after error is caught. Use for logging or analytics. |
| `onMount` | `() => void` | Called when error boundary mounts. |
| `onReset` | `(error: Error \| null) => void` | Called when error boundary is reset (via `resetError` function). |
| `onUnmount` | `(error: Error \| null) => void` | Called when error boundary unmounts. Receives error if one was caught. |
| `pushErrorOptions` | `PushErrorOptions` | Additional options passed to `faro.api.pushError()`. |
| `children` | `ReactNode \| () => ReactNode` | Component(s) to wrap with error boundary. |

**Features:**

- ✅ **Automatic Error Reporting**: Errors are automatically sent to Faro
- ✅ **Component Stack Traces**: Includes React component stack in error reports
- ✅ **Custom Fallback UI**: Show user-friendly error messages
- ✅ **Error Reset**: Programmatically recover from errors
- ✅ **Lifecycle Hooks**: React to error boundary lifecycle events
- ✅ **Flexible Configuration**: Static or dynamic fallback, custom error handling

**Best Practices:**

1. **Wrap your entire app** for global error catching:
   ```tsx
   <FaroErrorBoundary fallback={<GlobalErrorScreen />}>
     <App />
   </FaroErrorBoundary>
   ```

2. **Wrap critical sections** for granular error handling:
   ```tsx
   <FaroErrorBoundary fallback={<CheckoutError />}>
     <CheckoutFlow />
   </FaroErrorBoundary>
   ```

3. **Use dynamic fallback** for better UX:
   ```tsx
   fallback={(error, resetError) => (
     <ErrorView error={error} onRetry={resetError} />
   )}
   ```

4. **Combine with ErrorsInstrumentation** for comprehensive error tracking:
   - Error Boundary catches React component errors
   - ErrorsInstrumentation catches unhandled errors and promise rejections

## Configuration

### Instrumentation Options

```tsx
interface GetRNInstrumentationsOptions {
  /** Capture console logs (default: false) */
  captureConsole?: boolean;

  /** Track app state changes (background/foreground) (default: true) */
  trackAppState?: boolean;

  /** Capture errors (default: true) */
  captureErrors?: boolean;

  /** Track sessions (default: true) */
  trackSessions?: boolean;

  /** Track view/screen changes (default: true) */
  trackViews?: boolean;

  /** Track user actions/interactions (default: true) */
  trackUserActions?: boolean;
}
```

### Console Instrumentation Configuration

The console instrumentation can be configured with advanced options:

```tsx
import { initializeFaro, LogLevel } from '@grafana/faro-react-native';

initializeFaro({
  url: 'https://your-faro-collector-url',
  app: {
    name: 'my-app',
    version: '1.0.0',
  },
  consoleInstrumentation: {
    // Configure which log levels to capture
    // By default: [LogLevel.DEBUG, LogLevel.TRACE, LogLevel.LOG] are disabled
    disabledLevels: [LogLevel.DEBUG, LogLevel.TRACE],

    // Treat console.error as log instead of error (default: false)
    consoleErrorAsLog: false,

    // Enable advanced error serialization for better error details (default: false)
    // When enabled, payloads may become larger but include more error context
    serializeErrors: true,

    // Optional: Custom error serializer function
    errorSerializer: (args) => {
      return args
        .map((arg) => {
          if (typeof arg === 'object') {
            return JSON.stringify(arg, null, 2); // Pretty print objects
          }
          return String(arg);
        })
        .join(' ');
    },
  },
});
```

**Console Instrumentation Features:**

- **Configurable Log Levels**: Choose which console methods to capture (log, info, warn, error, debug, trace)
- **Smart Object Serialization**: Automatically converts objects to JSON strings instead of `[object Object]`
- **Advanced Error Serialization**: Extract detailed error information including:
  - Error message and type
  - Stack frames with file, function, line, and column information
  - Better handling of Error objects in console.error
- **Flexible Error Handling**: Choose to send console.error as:
  - Errors (default): Appears in error tracking views
  - Logs: Appears in log views with error context
- **Custom Serializers**: Provide your own logic for converting console arguments to strings
- **Unpatch Support**: Clean up console patching when needed

**Example Use Cases:**

```tsx
// Capture all console levels including debug
getRNInstrumentations({
  captureConsole: true,
});

initializeFaro({
  // ...
  consoleInstrumentation: {
    disabledLevels: [], // Capture everything
  },
});

// Send console.error as logs instead of errors
initializeFaro({
  // ...
  consoleInstrumentation: {
    consoleErrorAsLog: true,
  },
});

// Enable detailed error serialization
initializeFaro({
  // ...
  consoleInstrumentation: {
    serializeErrors: true, // Extract stack frames and error details
  },
});
```

### Errors Instrumentation Configuration

The errors instrumentation now includes enhanced features for React Native error tracking:

```tsx
import { initializeFaro, ErrorsInstrumentation } from '@grafana/faro-react-native';

initializeFaro({
  url: 'https://your-faro-collector-url',
  app: {
    name: 'my-app',
    version: '1.0.0',
  },
  instrumentations: [
    new ErrorsInstrumentation({
      // Ignore specific errors by message pattern
      ignoreErrors: [/network timeout/i, /cancelled/i, /aborted/i],

      // Enable error deduplication (default: true)
      // Prevents sending the same error multiple times within a time window
      enableDeduplication: true,

      // Deduplication time window in milliseconds (default: 5000)
      // Errors with same message/stack within this window are considered duplicates
      deduplicationWindow: 5000,

      // Maximum number of errors to track for deduplication (default: 50)
      maxDeduplicationEntries: 50,
    }),
  ],
});
```

**Enhanced Errors Instrumentation Features:**

- **React Native Stack Trace Parsing**: Automatically parses React Native stack traces into structured stack frames
  - Supports multiple formats: Dev mode, Release/minified, Metro bundler, Native calls
  - Extracts function name, filename, line number, and column number
  - Handles platform-specific stack trace formats (iOS/Android)

- **Platform Context**: Automatically includes platform information with every error:
  - Platform OS (ios/android)
  - Platform version
  - JavaScript engine (Hermes detection)

- **Error Deduplication**: Prevents duplicate error reports
  - Tracks errors by message and stack trace
  - Configurable time window (default: 5 seconds)
  - Memory-efficient with configurable maximum entries

- **Error Filtering**: Ignore specific errors using regex patterns
  - Filter by error message
  - Useful for ignoring known non-critical errors
  - Reduces noise in error tracking

- **Automatic Error Capture**:
  - Unhandled JavaScript errors (via ErrorUtils)
  - Unhandled promise rejections
  - Preserves original error handlers

**Example - Different Stack Trace Formats Handled:**

```
// Dev mode: at functionName (file.js:123:45)
// Release: functionName@123:456
// Native: at functionName (native)
// Metro: at Object.functionName (/path/to/file.js:123:456)
```

All formats are automatically parsed and converted to structured stack frames sent to Grafana Cloud.

**Example - Platform Context Included:**

Every error report includes:

```tsx
{
  platform: "ios",           // or "android"
  platformVersion: "17.0",   // iOS/Android version
  isHermes: "true"          // JavaScript engine
}
```

**Use Cases:**

```tsx
// Ignore network-related errors
new ErrorsInstrumentation({
  ignoreErrors: [/network/i, /fetch failed/i],
});

// Increase deduplication window for high-frequency errors
new ErrorsInstrumentation({
  deduplicationWindow: 10000, // 10 seconds
});

// Disable deduplication for debugging
new ErrorsInstrumentation({
  enableDeduplication: false,
});
```

### Custom Configuration

```tsx
import { initializeFaro } from '@grafana/faro-react-native';
import { ConsoleInstrumentation, ErrorsInstrumentation } from '@grafana/faro-react-native';

initializeFaro({
  url: 'https://your-faro-collector-url',
  app: {
    name: 'my-app',
    version: '1.0.0',
    environment: 'production',
  },
  instrumentations: [new ConsoleInstrumentation(), new ErrorsInstrumentation()],
  // Add custom metas
  metas: [
    // Your custom meta implementations
  ],
});
```

### Session Configuration

The SDK supports both persistent and volatile session tracking with configurable expiration and inactivity timeouts:

```tsx
import { initializeFaro } from '@grafana/faro-react-native';

initializeFaro({
  url: 'https://your-faro-collector-url',
  app: {
    name: 'my-app',
    version: '1.0.0',
  },
  sessionTracking: {
    enabled: true,
    // Use AsyncStorage for persistent sessions across app restarts
    persistent: true,
    // Session expires after 4 hours by default (can be customized)
    // Session is also invalidated after 15 minutes of inactivity

    // Optional: Sampling rate (0-1) to sample sessions
    samplingRate: 1.0, // 100% of sessions

    // Optional: Custom session ID generator
    generateSessionId: () => 'custom-session-id',

    // Optional: Callback when session changes
    onSessionChange: (previousSession, newSession) => {
      console.log('Session changed:', previousSession?.id, '->', newSession?.id);
    },

    // Optional: Initial session attributes
    session: {
      attributes: {
        customAttribute: 'value',
      },
    },
  },
});
```

**Session Types:**

- **Persistent Sessions** (`persistent: true`): Stored in AsyncStorage and survive app restarts. Sessions expire after 4 hours or 15 minutes of inactivity.

- **Volatile Sessions** (`persistent: false`, default): Stored in memory only. Each app launch creates a new session.

**Session Events:**

The SDK automatically emits session lifecycle events:

- `faro.session.start` - New session created
- `faro.session.resume` - Existing session resumed (persistent only)
- `faro.session.extend` - Session extended from the same previous session

### Default Session Attributes

Every telemetry event automatically includes default session attributes with device and SDK information. These attributes match the [Grafana Faro Flutter SDK](https://github.com/grafana/faro-flutter-sdk) format for cross-platform compatibility.

**Automatically Collected Attributes:**

| Attribute | Description | iOS Example | Android Example |
|-----------|-------------|-------------|-----------------|
| `faro_sdk_version` | SDK version | `2.0.2` | `2.0.2` |
| `react_native_version` | React Native version | `0.75.1` | `0.75.1` |
| `device_os` | Operating system | `iOS` | `Android` |
| `device_os_version` | OS version | `17.0` | `15` |
| `device_os_detail` | Detailed OS info | `iOS 17.0` | `Android 15 (SDK 35)` |
| `device_manufacturer` | Manufacturer | `apple` | `samsung` |
| `device_model` | Raw model identifier | `iPhone16,1` | `SM-A155F` |
| `device_model_name` | Human-readable model | `iPhone 15 Pro` | `SM-A155F`* |
| `device_brand` | Device brand | `iPhone` | `samsung` |
| `device_is_physical` | Physical or emulator | `true` | `true` |
| `device_id` | Unique device ID | `uuid` | `uuid` |

*Android does not provide a mapping from model codes to marketing names, so `device_model_name` equals `device_model`.

**How It Works:**

- Attributes are collected automatically during session initialization
- No manual configuration needed
- Uses existing `react-native-device-info` dependency
- Attributes are included with every telemetry event (logs, errors, measurements, etc.)
- Custom attributes can be added via `sessionTracking.session.attributes` (default attributes take precedence)

**Example Grafana Query:**

```logql
# Filter events by device OS
{app_name="my-app"} | json | device_os="iOS"

# Filter by specific device model
{app_name="my-app"} | json | device_model="iPhone16,1"

# Group by manufacturer
{app_name="my-app"} | json | count by device_manufacturer

# Filter emulator vs physical devices
{app_name="my-app"} | json | device_is_physical="false"
```

**Feature Parity with Flutter SDK:**

This implementation provides complete feature parity with the Grafana Faro Flutter SDK, ensuring consistent attribute naming and data format across platforms. This enables unified dashboards and queries for multi-platform applications.

### AppState Tracking

The SDK automatically tracks React Native app state changes (foreground/background/inactive). This is enabled by default and requires no additional configuration.

```tsx
import { initializeFaro, getRNInstrumentations } from '@grafana/faro-react-native';

initializeFaro({
  url: 'https://your-faro-collector-url',
  app: {
    name: 'my-app',
    version: '1.0.0',
  },
  instrumentations: [
    ...getRNInstrumentations({
      trackAppState: true, // Enabled by default
    }),
  ],
});
```

**App States:**

- **active**: App is running in the foreground
- **background**: User switched to another app or home screen
- **inactive**: Transitional state (incoming call, control center on iOS)
- **unknown**: Initial state before first change (iOS only)
- **extension**: App extension is running (iOS only)

**App State Events:**

The SDK automatically emits `app_state_changed` events when the app state transitions:

```typescript
{
  event_name: "app_state_changed",
  fromState: "active",       // Previous state
  toState: "background",     // New state
  duration: "5234",          // Time spent in previous state (ms)
  timestamp: "1701518400000" // Unix timestamp
}
```

**Use Cases:**

- Track user engagement (foreground vs background time)
- Identify background-related crashes or errors
- Measure session duration by app state
- Optimize background task scheduling
- Detect performance issues after returning from background

**Example Queries (Grafana Explore with Loki):**

```logql
# View all app state changes
{app_name="my-app", kind="event"}
| json
| event_name="app_state_changed"

# Count background transitions
{app_name="my-app", kind="event"}
| json
| event_name="app_state_changed"
| toState="background"

# Average time in foreground
{app_name="my-app", kind="event"}
| json
| event_name="app_state_changed"
| fromState="active"
| unwrap duration
| avg
```

For a complete example of app state tracking in action, see the [demo-react-native](../../demo-react-native) application.

### Performance Instrumentation Configuration

The Performance Instrumentation provides comprehensive performance monitoring for React Native applications, including **CPU usage**, **memory usage**, and **app startup time tracking**.

#### System Resource Monitoring (CPU & Memory)

The SDK automatically monitors system resources using **native OS-level APIs** for accurate metrics:

**iOS Implementation:**
- **CPU**: Uses `host_statistics()` with differential calculation for precise CPU percentage
- **Memory**: Uses `task_info()` to measure RSS (Resident Set Size) in kilobytes

**Android Implementation:**
- **CPU**: Parses `/proc/[pid]/stat` with differential calculation
- **Memory**: Parses `/proc/[pid]/status` for VmRSS in kilobytes

**Configuration:**

```tsx
import { initializeFaro, getRNInstrumentations } from '@grafana/faro-react-native';

initializeFaro({
  url: 'https://your-faro-collector-url',
  app: {
    name: 'my-app',
    version: '1.0.0',
  },
  instrumentations: getRNInstrumentations({
    // Enable performance monitoring (default: true)
    trackPerformance: true,

    // Enable memory usage monitoring (default: true)
    // Monitors RSS (Resident Set Size) - physical memory used by the app
    memoryUsageVitals: true,

    // Enable CPU usage monitoring (default: true)
    // Monitors CPU usage percentage via differential calculation
    cpuUsageVitals: true,

    // Collection interval in milliseconds (default: 30000 - 30 seconds)
    // Metrics are collected and sent at this interval
    fetchVitalsInterval: 30000,
  }),
});
```

**Metrics Collected:**

1. **CPU Usage** (`app_cpu_usage` measurement):
   - `cpu_usage` - CPU usage percentage (0-100+)
   - Collected periodically based on `fetchVitalsInterval`
   - First reading establishes baseline (returns 0)
   - Subsequent readings show actual CPU percentage

2. **Memory Usage** (`app_memory` measurement):
   - `mem_usage` - Memory usage in kilobytes (RSS)
   - Collected periodically based on `fetchVitalsInterval`
   - Measures physical memory currently used by the app

**Example Grafana Queries (Loki):**

```logql
# Average CPU usage over time
{app_name="my-app", kind="measurement"}
| json
| type="app_cpu_usage"
| unwrap cpu_usage
| rate(1m)

# Memory usage spikes
{app_name="my-app", kind="measurement"}
| json
| type="app_memory"
| unwrap mem_usage
| topk(10)

# CPU usage during specific screen
{app_name="my-app", kind="measurement"}
| json
| type="app_cpu_usage"
| view_name="HomeScreen"
| unwrap cpu_usage
| avg
```

**Platform Requirements:**
- **iOS**: Requires iOS 13.4+
- **Android**: Requires API 21+ (Lollipop) for CPU monitoring, any version for memory

**No Manual Setup Required!**
- Native modules are automatically linked via CocoaPods (iOS) and Gradle (Android)
- OS-level APIs are used - no permissions needed
- Works out of the box with default configuration

#### Startup Performance Monitoring

The SDK automatically tracks app startup time from process start to Faro initialization:

**Configuration:**

```tsx
initializeFaro({
  // ...config
  instrumentations: getRNInstrumentations({
    // Enable startup tracking (default: true)
    trackStartup: true,
  }),
});
```

**Startup Metric** (`faro.startup` event):
- `appStartDuration` - Time from process start to Faro init (milliseconds)
- Measured using native OS APIs:
  - **iOS**: `sysctl()` with `KERN_PROC` to get process start time
  - **Android**: Parses process start time from system

**Example Query:**

```logql
# Average app startup time
{app_name="my-app", kind="event"}
| json
| event_name="faro.startup"
| unwrap appStartDuration
| avg
```

#### Performance Best Practices

**For Production:**
```tsx
getRNInstrumentations({
  trackPerformance: true,
  memoryUsageVitals: true,
  cpuUsageVitals: true,
  fetchVitalsInterval: 30000, // 30 seconds - good balance
})
```

**For Debugging/Testing:**
```tsx
getRNInstrumentations({
  trackPerformance: true,
  memoryUsageVitals: true,
  cpuUsageVitals: true,
  fetchVitalsInterval: 5000, // 5 seconds - more frequent for testing
})
```

**Use Cases:**

- **Detect Memory Leaks**: Monitor memory growth over time
- **Identify CPU Bottlenecks**: Correlate CPU spikes with user actions
- **Track Startup Performance**: Measure app launch time improvements
- **Performance Regression Testing**: Compare metrics across app versions
- **Resource-Based Crash Analysis**: Correlate crashes with high memory/CPU usage

**Feature Parity with Flutter SDK:**

This implementation provides complete feature parity with the [Grafana Faro Flutter SDK](https://github.com/grafana/faro-flutter-sdk):
- Same native OS-level APIs
- Same differential CPU calculation approach
- Same memory measurement (RSS/VmRSS)
- Same configuration options
- Same default values (30-second interval)

## Navigation Integration

Faro provides seamless integration with React Navigation to automatically track screen changes.

### Quick Start

```tsx
import { useNavigationContainerRef } from '@react-navigation/native';
import { useFaroNavigation } from '@grafana/faro-react-native';

function App() {
  const navigationRef = useNavigationContainerRef();

  // Automatically track navigation changes
  useFaroNavigation(navigationRef);

  return <NavigationContainer ref={navigationRef}>{/* Your navigation */}</NavigationContainer>;
}
```

### Static Navigation API

For React Navigation 7+ static navigation:

```tsx
import { createStaticNavigation, useNavigationContainerRef } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { useFaroNavigation } from '@grafana/faro-react-native';

const RootStack = createNativeStackNavigator({
  screens: {
    Home: { screen: HomeScreen, options: { title: 'Welcome' } },
    Profile: { screen: ProfileScreen },
  },
});

const Navigation = createStaticNavigation(RootStack);

function App() {
  const navigationRef = useNavigationContainerRef();
  useFaroNavigation(navigationRef);

  return <Navigation ref={navigationRef} />;
}
```

For detailed integration guides, advanced usage, and troubleshooting, see [NAVIGATION_INTEGRATION.md](./NAVIGATION_INTEGRATION.md).

## Enhanced Device Meta

The Faro React Native SDK automatically collects comprehensive device information to provide better context for debugging and analytics.

### Automatically Collected Information

The SDK collects the following device information synchronously:

- **Device Info**: Brand, model, device ID, type (mobile/tablet)
- **System Info**: OS name, OS version, app version
- **Locale/Language**: Device locales, timezone, primary language
- **Memory**: Total and used memory
- **Screen**: Viewport width and height
- **Environment**: Whether running on emulator/simulator

### Async Device Information

For battery and network information that requires async calls, use `getAsyncDeviceMeta()`:

```tsx
import { getAsyncDeviceMeta } from '@grafana/faro-react-native';

// Fetch async device information
const asyncDeviceInfo = await getAsyncDeviceMeta();
console.log('Battery Level:', asyncDeviceInfo.batteryLevel);
console.log('Carrier:', asyncDeviceInfo.carrier);
console.log('Is Charging:', asyncDeviceInfo.isCharging);
console.log('Low Power Mode:', asyncDeviceInfo.lowPowerMode);
```

### Available Device Meta Fields

```typescript
interface ExtendedBrowserMeta {
  // Standard fields
  name: string; // OS name (e.g., "iOS", "Android")
  version: string; // App version
  os: string; // OS with version (e.g., "iOS 17.0")
  mobile: boolean; // true for mobile, false for tablet
  userAgent: string; // User agent string
  language: string; // Primary language
  brands: string; // Device brand and model
  viewportWidth: string; // Screen width
  viewportHeight: string; // Screen height

  // Enhanced fields
  locale?: string; // Primary locale (e.g., "en-US")
  locales?: string; // All device locales
  timezone?: string; // Device timezone (e.g., "America/New_York")
  deviceType?: string; // "mobile" or "tablet"
  isEmulator?: string; // "true" if running on emulator/simulator
  totalMemory?: string; // Total device memory in bytes
  usedMemory?: string; // Used memory in bytes

  // Async fields (from getAsyncDeviceMeta)
  batteryLevel?: string; // Battery percentage (e.g., "85%")
  isCharging?: string; // "true" if device is charging
  lowPowerMode?: string; // "true" if low power mode is enabled
  carrier?: string; // Mobile carrier name (e.g., "Verizon")
}
```

### Use Cases

**1. Debug Device-Specific Issues**

```tsx
// Query Grafana Cloud for errors on specific devices
{service_name="MyApp", browser_deviceType="tablet"}
| logfmt
| kind="exception"
```

**2. Track Low Battery Correlation**

```tsx
// Find if errors correlate with low battery
{service_name="MyApp", browser_batteryLevel=~"[0-9]%|[12][0-9]%"}
| logfmt
| kind="exception"
```

**3. Locale-Specific Analysis**

```tsx
// Analyze issues by locale
{service_name="MyApp", browser_locale=~"ja.*"}
| logfmt
```

**4. Memory Pressure Detection**

```tsx
// Correlate high memory usage with crashes
{service_name="MyApp"}
| logfmt
| browser_usedMemory > 1000000000
```

### Notes

- All device meta is collected automatically when Faro initializes
- Async device info (battery, carrier) is fetched lazily to avoid blocking initialization
- All fields are optional and gracefully handle permission errors
- Memory values are in bytes
- Battery level is a percentage string (e.g., "85%")

## TypeScript

The package is written in TypeScript and includes type definitions out of the box.

```tsx
import type { ReactNativeConfig, WithFaroUserActionProps } from '@grafana/faro-react-native';
```

## Examples

See the [demo-react-native](../../demo-react-native) directory for a complete example application.

## API Reference

### Core API

- `initializeFaro(config: ReactNativeConfig): void` - Initialize the Faro SDK
- `faro.api.pushEvent(name: string, attributes?: Record<string, string>)` - Track custom events
- `faro.api.pushLog(message: string, options?: PushLogOptions)` - Send log messages
- `faro.api.pushError(error: Error, options?: PushErrorOptions)` - Report errors
- `faro.api.pushMeasurement(measurement: Measurement)` - Track performance
- `faro.api.setUser(user: User)` - Identify users
- `faro.api.resetUser()` - Clear user identification

### User Actions API

- `withFaroUserAction<P>(Component, defaultActionName)` - HOC for tracking component interactions
- `trackUserAction(actionName, context?)` - Manual user action tracking

### Error Boundary API

- `FaroErrorBoundary` - React component for catching and reporting component errors
- `withFaroErrorBoundary<P>(Component, errorBoundaryProps)` - HOC for wrapping components with error boundary

### Transports

Transports control where and how telemetry data is sent.

#### FetchTransport

Sends telemetry to a remote Faro collector (default):

```tsx
import { initializeFaro, FetchTransport } from '@grafana/faro-react-native';

initializeFaro({
  url: 'https://faro-collector-prod-YOUR-REGION.grafana.net/collect/YOUR_TOKEN_HERE',
  app: { name: 'my-app', version: '1.0.0' },
  // FetchTransport is automatically configured from the url
});
```

#### ConsoleTransport

Logs telemetry to the console for debugging (useful during development):

```tsx
import { initializeFaro, ConsoleTransport, LogLevel } from '@grafana/faro-react-native';

initializeFaro({
  url: 'https://faro-collector-prod-YOUR-REGION.grafana.net/collect/YOUR_TOKEN_HERE',
  app: { name: 'my-app', version: '1.0.0' },
  transports: [
    new ConsoleTransport({
      level: LogLevel.INFO, // Optional: DEBUG, INFO, WARN, ERROR (default: DEBUG)
    }),
  ],
});
```

The ConsoleTransport prints formatted telemetry data to the console, showing:

- All metadata (device info, session, user, etc.)
- Event payloads (logs, errors, events, measurements)
- Structured JSON format for easy inspection

**Use Cases:**

- Local development and debugging
- Verify instrumentation is working correctly
- Inspect exact structure of events before they reach Grafana
- Test without sending data to production
- Run alongside FetchTransport for dual output

**Example Output:**

```javascript
console.debug('New event', {
  meta: {
    browser: { name: 'iOS', version: '18.0', ... },
    session: { id: 'abc123', ... },
    ...
  },
  logs: [{ message: 'Hello', level: 'info', ... }]
})
```

### Instrumentations

- `ConsoleInstrumentation` - Console logging
- `ErrorsInstrumentation` - Error tracking
- `SessionInstrumentation` - Session management
- `ViewInstrumentation` - View/screen tracking
- `AppStateInstrumentation` - App state changes
- `UserActionInstrumentation` - User interaction tracking
- `HttpInstrumentation` - HTTP request tracking with user action correlation
- `PerformanceInstrumentation` - CPU and memory usage monitoring
- `StartupInstrumentation` - App startup time tracking

### React Components

- `FaroErrorBoundary` - Error boundary component for catching React errors
- `withFaroErrorBoundary` - HOC for wrapping components with error boundary

## Future Enhancements

### TODO: PerformanceObserver Support

React Native Next (upcoming version) will include native `PerformanceObserver` support, which will enable greater feature parity with the web SDK's performance monitoring capabilities.

**Planned Enhancements:**
- Implement `PerformanceObserver`-based instrumentation similar to web SDK
- Support for performance entry types: `mark`, `measure`, `event`, `longtask`
- Real-time performance monitoring via observer callbacks
- Better integration with React Native's native performance APIs
- Enhanced performance timeline tracking

**References:**
- [React Native PerformanceObserver API Documentation](https://reactnative.dev/docs/next/global-PerformanceObserver)
- Web SDK Performance Instrumentation: `packages/web-sdk/src/instrumentations/performance/`

**Current State:**
The current implementation uses custom performance utilities (`performanceUtils.ts`) that provide basic timing and marker functionality. Once React Native's `PerformanceObserver` is stable, we can migrate to a more comprehensive solution that matches the web SDK's capabilities.

## License

Apache-2.0
