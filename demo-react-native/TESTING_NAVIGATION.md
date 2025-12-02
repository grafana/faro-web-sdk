# Testing Navigation Tracking in Faro React Native Demo

This guide will help you test the navigation tracking features in the Faro React Native demo app.

## Prerequisites

1. **Node.js**: Version 20+ (check with `node --version`)
2. **Yarn**: Package manager (check with `yarn --version`)
3. **Xcode** (for iOS): Latest version with command line tools
4. **Android Studio** (for Android): With SDK and emulator set up
5. **Grafana Cloud Account**: To view the telemetry data

## Setup

### 1. Build the React Native SDK

From the repository root, build the React Native package:

```bash
cd /Users/srsholmes/Work/faro-web-sdk

# Build the React Native SDK
yarn workspace @grafana/faro-react-native build
```

### 2. Install Demo Dependencies

```bash
cd demo-react-native
yarn install

# For iOS only (skip if you're testing on Android)
cd ios
bundle install
bundle exec pod install
cd ..
```

### 3. Configure Environment Variables

The demo needs your Grafana Cloud Faro collector URL. Create a `.env` file:

```bash
# Copy the example file
cp .env.example .env

# Edit .env and add your Faro collector URL
# Get this from Grafana Cloud > Frontend Observability > Configuration
```

Your `.env` should look like:
```
FARO_COLLECTOR_URL=https://faro-collector-prod-YOUR-REGION.grafana.net/collect/YOUR_TOKEN_HERE
```

## Running the Demo

### Option 1: iOS (macOS only)

```bash
# Start Metro bundler in one terminal
yarn start

# In another terminal, run iOS
yarn ios

# Or run on a specific device
yarn ios --simulator="iPhone 15 Pro"
```

### Option 2: Android

```bash
# Make sure you have an emulator running or device connected
# Check with: adb devices

# Start Metro bundler in one terminal
yarn start

# In another terminal, run Android
yarn android
```

## Testing Navigation Tracking

### 1. Launch the App

When the app starts, you should see:
- **Home Screen** with navigation buttons
- Faro is automatically initialized
- An initial `faro_initialized` event is sent

### 2. Navigate Between Screens

Try these navigation flows:

**Flow 1: Basic Navigation**
1. Tap "Error Demo" button → Navigate to Error Demo screen
2. Tap back button → Return to Home screen
3. Tap "About" button → Navigate to About screen

**Flow 2: Deep Navigation**
1. From Home → "Performance Demo"
2. From Performance Demo → back to Home
3. From Home → "Error Boundary Demo"
4. From Error Boundary Demo → back to Home

**Flow 3: Quick Navigation**
1. Rapidly tap: Home → About → Home → Error Demo → Home
2. This tests that duplicate events aren't sent

### 3. What Gets Tracked

For each navigation, Faro automatically sends:

**VIEW_CHANGED Event:**
```json
{
  "event_name": "faro.view.changed",
  "fromView": "Home",
  "toView": "ErrorDemo"
}
```

**Meta Updates:**
- `meta.view.name`: Updated to current screen name
- `meta.page.url`: Updated to `screen://ScreenName`

**Console Output:**
If you have React Native DevTools open, you'll see logs like:
```
[Faro] View changed: Home -> ErrorDemo
```

## Viewing Data in Grafana Cloud

### 1. Access Grafana Cloud

1. Go to your Grafana Cloud instance: `https://YOUR-ORG.grafana.net`
2. Navigate to **Explore** (compass icon in left sidebar)
3. Select your **Loki** data source from the dropdown

### 2. Query Navigation Events

#### View All Navigation Events
```logql
{app_name="React Native Test", kind="event"}
| json
| event_name="faro.view.changed"
```

#### View Navigation Flow
```logql
{app_name="React Native Test", kind="event"}
| json
| event_name="faro.view.changed"
| line_format "{{.fromView}} -> {{.toView}}"
```

#### Filter by Specific Screen
```logql
{app_name="React Native Test", kind="event"}
| json
| event_name="faro.view.changed"
| toView="ErrorDemo"
```

#### Count Navigation Events
```logql
{app_name="React Native Test", kind="event"}
| json
| event_name="faro.view.changed"
| toView!=""
```

#### View All Events from a Session
```logql
{app_name="React Native Test", session_id="YOUR_SESSION_ID"}
```

You can find your session ID in the app logs or in any event's metadata.

### 3. Create a Navigation Dashboard

In Grafana, create visualizations like:

**Panel 1: Navigation Flow (Sankey Diagram)**
- Shows user flow between screens
- Query: Count of fromView → toView transitions

**Panel 2: Most Visited Screens (Bar Chart)**
```logql
sum by (toView) (
  count_over_time(
    {app_name="React Native Test", kind="event"}
    | json
    | event_name="faro.view.changed"
    [24h]
  )
)
```

**Panel 3: Navigation Events Over Time (Time Series)**
```logql
rate({app_name="React Native Test", kind="event"}
| json
| event_name="faro.view.changed"
[5m])
```

## Debugging

### Navigation Not Being Tracked?

**Check 1: Verify Faro is initialized**
```bash
# Look for this in React Native logs
[Faro] View instrumentation initialized
```

**Check 2: Verify navigation ref is attached**
Open `demo-react-native/src/navigation/AppNavigator.tsx` and ensure:
```tsx
const navigationRef = useNavigationContainerRef();
useFaroNavigation(navigationRef);
return <NavigationContainer ref={navigationRef}>
```

**Check 3: Check ViewInstrumentation is enabled**
In `src/faro/initialize.ts`, verify:
```tsx
getRNInstrumentations({
  trackViews: true, // Must be true
})
```

**Check 4: Verify collector URL**
```bash
cat .env
# Should show: FARO_COLLECTOR_URL=https://...
```

### Events Not Appearing in Grafana Cloud?

**Check 1: Network connectivity**
- Open React Native debugger
- Go to Network tab
- Navigate between screens
- Look for POST requests to your Faro collector URL
- Status should be 200 or 204

**Check 2: Faro collector URL is correct**
- Go to Grafana Cloud > Frontend Observability
- Copy the collector URL from Configuration section
- Update `.env` file

**Check 3: Wait a few seconds**
- Loki has a small ingestion delay (5-30 seconds)
- Try refreshing your query after waiting

### Duplicate Events?

If you see duplicate VIEW_CHANGED events:
- Check that you're not using both `useFaroNavigation` AND `onStateChange`
- Only use one method of integration

## Testing Session Persistence

Navigation tracking works with session tracking. Test this:

1. **Start app** → Navigate to a few screens
2. **Kill app** (swipe up from task manager)
3. **Restart app** → Navigate to more screens
4. **Check Grafana**: All events should have the same `session_id` (if within 4 hours)

Query to verify:
```logql
{app_name="React Native Test", session_id="YOUR_SESSION_ID"}
| json
| line_format "{{.timestamp}} - {{.event_name}} - {{.toView}}"
```

## Advanced Testing

### Test Nested Navigators

If you add tab navigation or drawer navigation:

```tsx
// Example: Add tab navigator
const Tab = createBottomTabNavigator();

function TabNavigator() {
  return (
    <Tab.Navigator>
      <Tab.Screen name="Feed" component={FeedScreen} />
      <Tab.Screen name="Profile" component={ProfileScreen} />
    </Tab.Navigator>
  );
}

// Faro automatically tracks the deepest active screen
// Navigating to Feed tab will track "Feed", not "Main"
```

### Test with Route Parameters

Add a screen with parameters:

```tsx
// In AppNavigator.tsx
type RootStackParamList = {
  // ... existing screens
  UserProfile: { userId: string };
};

// Add screen
<Stack.Screen name="UserProfile" component={UserProfileScreen} />

// Navigate with params
navigation.navigate('UserProfile', { userId: '123' });
```

Faro will send a `navigation` event with params:
```json
{
  "event_name": "navigation",
  "screen": "UserProfile",
  "params": "{\"userId\":\"123\"}"
}
```

Query in Grafana:
```logql
{app_name="React Native Test", kind="event", event_name="navigation"}
| json
```

## Troubleshooting Common Issues

### Metro Bundler Issues

```bash
# Clear cache and restart
yarn start --reset-cache

# If that doesn't work, clear watchman
watchman watch-del-all
rm -rf node_modules
yarn install
```

### Build Issues

```bash
# iOS
cd ios
pod deintegrate
pod install
cd ..
yarn ios

# Android
cd android
./gradlew clean
cd ..
yarn android
```

### Module Resolution Issues

If you get errors about `@grafana/faro-react-native` not found:

1. Make sure you built the SDK: `yarn workspace @grafana/faro-react-native build`
2. Check `metro.config.js` has the correct path to the package
3. Restart Metro bundler

## Expected Results

After testing navigation for 5 minutes, you should see in Grafana Cloud:

- ✅ At least 10-20 `faro.view.changed` events
- ✅ Events showing navigation between all 5 screens
- ✅ `fromView` and `toView` attributes populated correctly
- ✅ Session ID consistent across all events
- ✅ Timestamps matching your testing time

## Next Steps

Once navigation tracking is working:
1. Test other instrumentations (errors, user actions, performance)
2. Create Grafana dashboards to visualize navigation patterns
3. Set up alerts for unusual navigation behavior
4. Integrate with your production app

## Support

If you encounter issues:
1. Check the main README: `/demo-react-native/README.md`
2. Review the integration guide: `packages/react-native/NAVIGATION_INTEGRATION.md`
3. Check React Native SDK docs: `packages/react-native/README.md`
4. Open an issue on GitHub
