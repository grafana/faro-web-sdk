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

## Navigation Integration

### React Navigation v6

```tsx
import { useEffect } from 'react';
import { useNavigationContainerRef } from '@react-navigation/native';
import { faro } from '@grafana/faro-react-native';

function App() {
  const navigationRef = useNavigationContainerRef();

  useEffect(() => {
    const unsubscribe = navigationRef.current?.addListener('state', () => {
      const currentRoute = navigationRef.current?.getCurrentRoute();
      if (currentRoute) {
        faro.api.pushEvent('view_change', {
          routeName: currentRoute.name,
          params: JSON.stringify(currentRoute.params || {}),
        });
      }
    });

    return unsubscribe;
  }, []);

  return (
    <NavigationContainer ref={navigationRef}>
      {/* Your navigation */}
    </NavigationContainer>
  );
}
```

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
