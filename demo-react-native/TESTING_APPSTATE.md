# Testing AppState Instrumentation in Faro React Native Demo

This guide explains how to test the AppState instrumentation which tracks when your React Native app moves between foreground, background, and inactive states.

## What is AppState Tracking?

AppState instrumentation tracks app lifecycle transitions:

- **active**: App is running in the foreground
- **background**: User switched to another app or home screen
- **inactive**: Transitional state (incoming call, control center opened)
- **unknown**: Initial state before first change (iOS only)
- **extension**: App extension is running (iOS only)

## Prerequisites

The app should already be running from previous testing. If not, follow the setup steps in `TESTING_NAVIGATION.md` first.

## How to Test

### 1. Verify AppState Instrumentation is Enabled

The AppState instrumentation is enabled by default in the demo app (`src/faro/initialize.ts`):

```tsx
getRNInstrumentations({
  trackAppState: true, // Enabled by default
  // ...
});
```

### 2. Trigger App State Changes

**Method 1: Home Button / Swipe (Background)**

1. With the app open, press the Home button (simulator) or swipe up (device)
2. Wait 2-3 seconds
3. Reopen the app
4. This triggers: `active` → `background` → `active`

**Method 2: App Switcher (Background)**

1. Double-tap Home button or swipe up and hold (iOS)
2. Switch to another app
3. Switch back to the Faro demo
4. This triggers: `active` → `inactive` → `background` → `inactive` → `active`

**Method 3: Control Center (Inactive - iOS only)**

1. Swipe down from top-right corner (iOS)
2. Close control center
3. This triggers: `active` → `inactive` → `active`

**Method 4: Notification Center (Inactive)**

1. Pull down notification center while app is open
2. Close it
3. This triggers: `active` → `inactive` → `active`

**Method 5: Incoming Call Simulation (iOS Simulator)**

1. In Simulator menu: **Hardware** → **Simulate Call**
2. Accept or decline the call
3. This triggers: `active` → `inactive` → `background` (if accepted) → `active`

### 3. What Gets Tracked

For each app state change, Faro sends an `app_state_changed` event with:

```json
{
  "event_name": "app_state_changed",
  "fromState": "active",
  "toState": "background",
  "duration": "5234", // Time spent in previous state (ms)
  "timestamp": "1701518400000"
}
```

### 4. View Events in Console (Debug)

If you have React Native DevTools or console logging enabled, you'll see:

```
[Faro] AppState instrumentation initialized { initialState: 'active' }
[Faro] App moved to background { fromState: 'active', duration: 5234 }
[Faro] App returned to foreground { duration: 1523 }
```

## Viewing Data in Grafana Cloud

### 1. Access Grafana Cloud Explore

1. Go to your Grafana Cloud instance: `https://YOUR-ORG.grafana.net`
2. Navigate to **Explore** (compass icon in left sidebar)
3. Select your **Loki** data source from the dropdown

### 2. Query App State Events

**Important:** Grafana Cloud stores Faro events using `logfmt` format with `event_data_` prefixes for event attributes.

#### View All App State Changes

```logql
{service_name="React Native Test", kind="event"}
| logfmt
| line_format "{{.event_data_fromState}} -> {{.event_data_toState}} ({{.event_data_duration}}ms)"
```

#### View Background Transitions

```logql
{service_name="React Native Test", kind="event"}
| logfmt
| event_data_toState="background"
| line_format "{{.event_data_fromState}} -> {{.event_data_toState}} ({{.event_data_duration}}ms)"
```

#### View Foreground Returns

```logql
{service_name="React Native Test", kind="event"}
| logfmt
| event_data_toState="active"
| event_data_fromState="background"
| line_format "{{.event_data_fromState}} -> {{.event_data_toState}} ({{.event_data_duration}}ms)"
```

#### Count State Transitions by Type

```logql
sum by (event_data_toState) (
  count_over_time(
    {service_name="React Native Test", kind="event"}
    | logfmt
    [24h]
  )
)
```

#### Average Time in Each State

```logql
avg by (event_data_fromState) (
  avg_over_time(
    {service_name="React Native Test", kind="event"}
    | logfmt
    | unwrap event_data_duration
    [1h]
  )
)
```

#### App State Timeline

```logql
{service_name="React Native Test", kind="event"}
| logfmt
| line_format "{{.event_data_timestamp}}: {{.event_data_fromState}} -> {{.event_data_toState}} ({{.event_data_duration}}ms)"
```

### 3. Create App State Dashboard

In Grafana, create panels to visualize app state data:

**Panel 1: State Transitions Over Time (Time Series)**

```logql
rate({service_name="React Native Test", kind="event"}
| logfmt
[5m])
```

**Panel 2: Most Common State Transitions (Bar Chart)**

```logql
sum by (event_data_fromState, event_data_toState) (
  count_over_time(
    {service_name="React Native Test", kind="event"}
    | logfmt
    [24h]
  )
)
```

**Panel 3: Average Duration in Each State (Stat Panel)**

```logql
avg_over_time({service_name="React Native Test", kind="event"}
| logfmt
| unwrap event_data_duration
[1h])
```

**Panel 4: Background/Foreground Ratio (Pie Chart)**

```logql
sum by (event_data_toState) (
  count_over_time(
    {service_name="React Native Test", kind="event"}
    | logfmt
    | event_data_toState=~"active|background"
    [24h]
  )
)
```

## Advanced Testing

### Test Session Continuity Across Background

1. Open the app (session starts)
2. Navigate to a few screens
3. Background the app for 5 seconds
4. Return to foreground
5. Navigate to more screens
6. **Check**: All events should have the same `session_id` (session persists across background)

Query to verify:

```logql
{service_name="React Native Test", session_id="YOUR_SESSION_ID"}
| logfmt
| line_format "{{.event_data_timestamp}} - {{.event_data_toState}}"
```

### Test Long Background Duration

1. Open the app
2. Background it for 20+ minutes
3. Return to foreground
4. **Check**: Session might be extended or new session created (depending on inactivity timeout)

### Correlate App State with Errors

Test if errors occur when returning from background:

```logql
{service_name="React Native Test"}
| logfmt
```

Look for errors that happen within a few seconds of events where `event_data_toState="active"`.

### Test Inactive State (iOS)

iOS has more granular states than Android:

1. Open Control Center → `active` → `inactive`
2. Receive a call → `active` → `inactive` → `background`
3. Open Notification Center → `active` → `inactive`

## Troubleshooting

### App State Events Not Appearing?

**Check 1: Verify instrumentation is enabled**

```bash
# In src/faro/initialize.ts
trackAppState: true  // Must be true
```

**Check 2: Check Faro logs**
Look for: `[Faro] AppState instrumentation initialized`

**Check 3: Trigger obvious state changes**
Try backgrounding the app with the Home button - this is the most reliable way to trigger a state change.

**Check 4: Wait a few seconds**
Loki has a small ingestion delay (5-30 seconds). Try refreshing your query after waiting.

### Events Missing fromState?

The first app state change after app launch might have `fromState="unknown"` because there's no previous state. This is normal.

### Android vs iOS Differences

**iOS:**

- Has `inactive` state (transitional)
- More granular state tracking
- Better support for multitasking states

**Android:**

- Primarily uses `active` and `background`
- `inactive` is less common
- Simpler state model

## Expected Results

After 5 minutes of testing (backgrounding and foregrounding the app several times), you should see in Grafana Cloud:

- ✅ At least 5-10 `app_state_changed` events
- ✅ Events with `toState="background"` when you background the app
- ✅ Events with `toState="active"` when you return to foreground
- ✅ `duration` values showing time spent in each state
- ✅ Timestamps matching your testing time
- ✅ Session ID consistent across state changes

## Use Cases

### 1. Track User Engagement

Measure how long users keep your app in the foreground vs background.

### 2. Identify Background-Related Crashes

Correlate errors with returning from background state.

### 3. Optimize Background Tasks

Measure frequency and duration of background sessions to optimize background task scheduling.

### 4. Session Analysis

Understand how app state transitions affect session duration and user journeys.

### 5. Performance Monitoring

Track if performance degrades after returning from background (e.g., memory pressure, state restoration issues).

## Next Steps

Once app state tracking is working:

1. Combine with error tracking to identify background-related crashes
2. Create alerts for unusual backgrounding patterns
3. Track session duration by app state
4. Correlate app state with user actions and navigation

## Support

If you encounter issues:

1. Check the main README: `/demo-react-native/README.md`
2. Review the React Native SDK docs: `packages/react-native/README.md`
3. Open an issue on GitHub
