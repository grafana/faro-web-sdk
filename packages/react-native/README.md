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

### Tracking User Actions

The SDK provides two ways to track user interactions:

#### 1. Using the HOC (Higher-Order Component)

Wrap your touchable components with `withFaroUserAction`:

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

#### 2. Using Manual Tracking

For complex workflows or custom tracking:

```tsx
import { trackUserAction } from '@grafana/faro-react-native';

function handleComplexAction() {
  const action = trackUserAction('complex_workflow', {
    step: '1',
    userId: '123'
  });

  // Do your work...
  await performSomeWork();

  // End the action when done
  action?.end();
}
```

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
  instrumentations: [
    new ConsoleInstrumentation(),
    new ErrorsInstrumentation(),
  ],
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
      trackAppState: true,  // Enabled by default
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

For detailed testing instructions, see `demo-react-native/TESTING_APPSTATE.md`.

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

  return (
    <NavigationContainer ref={navigationRef}>
      {/* Your navigation */}
    </NavigationContainer>
  );
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

## TypeScript

The package is written in TypeScript and includes type definitions out of the box.

```tsx
import type {
  ReactNativeConfig,
  WithFaroUserActionProps,
} from '@grafana/faro-react-native';
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

### Instrumentations

- `ConsoleInstrumentation` - Console logging
- `ErrorsInstrumentation` - Error tracking
- `SessionInstrumentation` - Session management
- `ViewInstrumentation` - View/screen tracking
- `AppStateInstrumentation` - App state changes
- `UserActionInstrumentation` - User interaction tracking

## License

Apache-2.0
