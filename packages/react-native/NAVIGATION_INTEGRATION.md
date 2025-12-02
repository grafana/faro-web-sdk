# React Navigation Integration Guide

This guide shows how to integrate Faro with React Navigation to automatically track screen changes.

## Quick Start

### Option 1: Using the Hook (Recommended)

The easiest way to integrate Faro with React Navigation is using the `useFaroNavigation` hook:

```tsx
import * as React from 'react';
import { NavigationContainer, useNavigationContainerRef } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { initializeFaro, useFaroNavigation, getRNInstrumentations } from '@grafana/faro-react-native';

// Initialize Faro
initializeFaro({
  url: 'https://faro-collector-prod-YOUR-REGION.grafana.net/collect/YOUR_TOKEN_HERE',
  app: {
    name: 'your-app-name',
    version: '1.0.0',
  },
  instrumentations: getRNInstrumentations({
    captureConsole: true,
    trackViews: true, // Enable view tracking
  }),
});

const Stack = createNativeStackNavigator();

function App() {
  // Create a navigation ref
  const navigationRef = useNavigationContainerRef();

  // Integrate Faro with React Navigation
  useFaroNavigation(navigationRef);

  return (
    <NavigationContainer ref={navigationRef}>
      <Stack.Navigator>
        <Stack.Screen name="Home" component={HomeScreen} />
        <Stack.Screen name="Profile" component={ProfileScreen} />
        <Stack.Screen name="Settings" component={SettingsScreen} />
      </Stack.Navigator>
    </NavigationContainer>
  );
}

export default App;
```

### Option 2: Using Static Navigation (React Navigation 7+)

If you're using the new static navigation API:

```tsx
import * as React from 'react';
import { createStaticNavigation, useNavigationContainerRef } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { initializeFaro, useFaroNavigation, getRNInstrumentations } from '@grafana/faro-react-native';

// Initialize Faro
initializeFaro({
  url: 'https://faro-collector-prod-YOUR-REGION.grafana.net/collect/YOUR_TOKEN_HERE',
  app: {
    name: 'your-app-name',
    version: '1.0.0',
  },
  instrumentations: getRNInstrumentations({
    trackViews: true, // Enable view tracking
  }),
});

// Define your navigation structure
const RootStack = createNativeStackNavigator({
  screens: {
    Home: {
      screen: HomeScreen,
      options: { title: 'Welcome' },
    },
    Profile: {
      screen: ProfileScreen,
    },
    Settings: {
      screen: SettingsScreen,
    },
  },
});

// Create the static navigation
const Navigation = createStaticNavigation(RootStack);

function App() {
  // Create a navigation ref for the static navigation
  const navigationRef = useNavigationContainerRef();

  // Integrate Faro with the static navigation
  useFaroNavigation(navigationRef);

  return <Navigation ref={navigationRef} />;
}

export default App;
```

### Option 3: Manual Integration with onStateChange

If you prefer manual control or can't use the hook:

```tsx
import * as React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { initializeFaro, createNavigationStateChangeHandler, getRNInstrumentations } from '@grafana/faro-react-native';

// Initialize Faro
initializeFaro({
  url: 'https://faro-collector-prod-YOUR-REGION.grafana.net/collect/YOUR_TOKEN_HERE',
  app: {
    name: 'your-app-name',
    version: '1.0.0',
  },
  instrumentations: getRNInstrumentations({
    trackViews: true,
  }),
});

const Stack = createNativeStackNavigator();

function App() {
  // Create the navigation state change handler
  const onStateChange = createNavigationStateChangeHandler();

  return (
    <NavigationContainer onStateChange={onStateChange}>
      <Stack.Navigator>
        <Stack.Screen name="Home" component={HomeScreen} />
        <Stack.Screen name="Profile" component={ProfileScreen} />
      </Stack.Navigator>
    </NavigationContainer>
  );
}

export default App;
```

## What Gets Tracked?

When you integrate Faro with React Navigation, the following data is automatically collected:

### Screen Changes

- **Event Type**: `faro.view.changed`
- **Attributes**:
  - `fromView`: Previous screen name
  - `toView`: Current screen name

### Navigation Events (with params)

- **Event Type**: `navigation`
- **Attributes**:
  - `screen`: Screen name
  - `params`: Route parameters (stringified)

### Meta Data

- **Screen Name**: Updated in `meta.view.name`
- **Screen URL**: Updated in `meta.page.url` as `screen://{screenName}`

## Example Screens

Here are example screen components you can use:

```tsx
import React from 'react';
import { View, Text, Button, StyleSheet } from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';

type RootStackParamList = {
  Home: undefined;
  Profile: { userId: string };
  Settings: undefined;
};

type HomeProps = NativeStackScreenProps<RootStackParamList, 'Home'>;

function HomeScreen({ navigation }: HomeProps) {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>Welcome to Faro Demo!</Text>

      <Button title="Go to Profile" onPress={() => navigation.navigate('Profile', { userId: '123' })} />

      <Button title="Go to Settings" onPress={() => navigation.navigate('Settings')} />
    </View>
  );
}

type ProfileProps = NativeStackScreenProps<RootStackParamList, 'Profile'>;

function ProfileScreen({ navigation, route }: ProfileProps) {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>Profile Screen</Text>
      <Text>User ID: {route.params.userId}</Text>

      <Button title="Go Back" onPress={() => navigation.goBack()} />
    </View>
  );
}

type SettingsProps = NativeStackScreenProps<RootStackParamList, 'Settings'>;

function SettingsScreen({ navigation }: SettingsProps) {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>Settings Screen</Text>

      <Button title="Go Home" onPress={() => navigation.navigate('Home')} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 16,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
  },
});

export { HomeScreen, ProfileScreen, SettingsScreen };
```

## Viewing Navigation Data in Grafana Cloud

To view your navigation tracking data in Grafana Cloud:

1. Go to your Grafana Cloud instance
2. Navigate to **Explore**
3. Select your **Loki** data source
4. Query your data:

```logql
{app_name="your-app-name", kind="event"}
| json
| event_name="faro.view.changed"
```

Filter by specific screens:

```logql
{app_name="your-app-name", kind="event"}
| json
| event_name="faro.view.changed"
| toView="Home"
```

View navigation flow:

```logql
{app_name="your-app-name", kind="event"}
| json
| event_name="faro.view.changed"
| line_format "{{.fromView}} -> {{.toView}}"
```

## Advanced Usage

### Custom Screen Tracking

If you need custom logic for screen tracking, you can use the lower-level utilities:

```tsx
import { faro } from '@grafana/faro-react-native';
import { setCurrentScreen } from '@grafana/faro-react-native/metas/screen';

function customNavigationHandler(screenName: string) {
  // Update the screen meta
  setCurrentScreen(screenName);

  // Update the view meta (triggers VIEW_CHANGED event)
  faro.api.setView({ name: screenName });

  // Optionally push additional events
  faro.api.pushEvent('custom_navigation', {
    screen: screenName,
    timestamp: Date.now().toString(),
  });
}
```

### Nested Navigators

The integration automatically handles nested navigators and will track the deepest active screen:

```tsx
function App() {
  const navigationRef = useNavigationContainerRef();
  useFaroNavigation(navigationRef);

  return (
    <NavigationContainer ref={navigationRef}>
      <Stack.Navigator>
        <Stack.Screen name="Main" component={TabNavigator} />
        <Stack.Screen name="Modal" component={ModalScreen} />
      </Stack.Navigator>
    </NavigationContainer>
  );
}

function TabNavigator() {
  return (
    <Tab.Navigator>
      <Tab.Screen name="Feed" component={FeedScreen} />
      <Tab.Screen name="Profile" component={ProfileScreen} />
    </Tab.Navigator>
  );
}
```

When users navigate to the Feed tab, Faro will track it as `Feed`, not `Main`.

## Troubleshooting

### Navigation not being tracked

**Problem**: Screen changes aren't showing up in Grafana Cloud.

**Solution**:

1. Ensure ViewInstrumentation is enabled:
   ```tsx
   instrumentations: getRNInstrumentations({
     trackViews: true, // Must be true
   });
   ```
2. Verify the navigation ref is properly passed:
   ```tsx
   const navigationRef = useNavigationContainerRef();
   useFaroNavigation(navigationRef); // Must pass the ref
   <NavigationContainer ref={navigationRef}> {/* Must attach ref */}
   ```
3. Check your console for any Faro errors

### Duplicate events

**Problem**: Getting duplicate VIEW_CHANGED events.

**Solution**: Make sure you're not using both the hook AND onStateChange callback:

```tsx
// ❌ Bad - using both
const onStateChange = createNavigationStateChangeHandler();
useFaroNavigation(navigationRef);
<NavigationContainer ref={navigationRef} onStateChange={onStateChange}>

// ✅ Good - use only one
useFaroNavigation(navigationRef);
<NavigationContainer ref={navigationRef}>
```

### Screen names not descriptive

**Problem**: Screen names like "index" or "screen1" aren't helpful.

**Solution**: Use descriptive screen names in your navigator:

```tsx
// ❌ Bad
<Stack.Screen name="screen1" component={UserProfile} />

// ✅ Good
<Stack.Screen name="UserProfile" component={UserProfile} />
```

## API Reference

### `useFaroNavigation(navigationRef)`

React hook that automatically tracks navigation changes.

**Parameters:**

- `navigationRef`: React ref object from `useNavigationContainerRef()`

**Returns:** `void`

---

### `createNavigationStateChangeHandler()`

Creates a callback function for NavigationContainer's `onStateChange` prop.

**Returns:** `(state: NavigationState | undefined) => void`

---

### `onNavigationStateChange(state)`

Manually handles navigation state changes.

**Parameters:**

- `state`: NavigationState object

**Returns:** `void`

---

### `getCurrentRoute(state)`

Gets the currently active route from navigation state.

**Parameters:**

- `state`: NavigationState or PartialState object

**Returns:** `Route<string> | undefined`

---

### `getRouteName(route)`

Extracts the route name from a route object.

**Parameters:**

- `route`: Route object

**Returns:** `string | undefined`

## Next Steps

- [User Action Tracking](./README.md#tracking-user-actions) - Track button presses and interactions
- [Error Tracking](./README.md#manual-error-tracking) - Capture and report errors
- [Custom Events](./README.md#custom-events) - Track custom business events
- [Session Management](./README.md#session-configuration) - Configure session tracking
