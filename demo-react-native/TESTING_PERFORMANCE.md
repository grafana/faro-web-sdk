# Testing Performance Instrumentation

This guide explains how to test the Performance Instrumentation in the Faro React Native demo app.

## What Performance Instrumentation Tracks

The Performance Instrumentation automatically captures:

1. **App Launch Performance**
   - Cold starts (app not in memory)
   - Warm starts (app returning from background)
   - JavaScript bundle load time
   - Time to first screen render
   - Total launch time

2. **Screen Navigation Performance**
   - Screen mount time
   - Transition time between screens
   - Links screens for user journey tracking
   - Previous/current screen names

## Setup (Already Configured)

The demo app is already set up with performance tracking:

### 1. App Start Marker (`index.js`)

```typescript
import { markAppStart } from '@grafana/faro-react-native';
markAppStart(); // ✅ Already added - marks the very beginning of app launch
```

### 2. Bundle Loaded Marker (`App.tsx`)

```typescript
import { markBundleLoaded } from '@grafana/faro-react-native';
markBundleLoaded(); // ✅ Already added - marks when JS bundle is loaded
```

### 3. Performance Instrumentation Enabled

Performance tracking is enabled in `src/faro/initialize.ts`:

```typescript
getRNInstrumentations({
  trackPerformance: true, // ✅ Already enabled
})
```

## How to Test

### Test 1: App Launch Performance (Cold Start)

**Steps:**
1. **Close the app completely** (swipe up from task switcher)
2. **Reopen the app**
3. **Check logs** for the performance event

**Expected Event in Grafana Cloud:**
```json
{
  "event_name": "faro.performance.app_launch",
  "faroLaunchId": "abc123",
  "platform": "ios",
  "platformVersion": "17.0",
  "launchType": "cold",
  "jsBundleLoadTime": "245",      // Time to load JS bundle (ms)
  "timeToFirstScreen": "892",     // Time until first screen renders (ms)
  "totalLaunchTime": "892"        // Total launch time (ms)
}
```

**Metrics to Observe:**
- `jsBundleLoadTime`: Should be 200-500ms (depends on bundle size)
- `timeToFirstScreen`: Should be 500-1500ms (depends on device)
- `totalLaunchTime`: Same as timeToFirstScreen (end-to-end)
- `launchType`: Should be "cold"

---

### Test 2: App Launch Performance (Warm Start)

**Steps:**
1. **Press home button** (or swipe up to minimize)
2. **Wait 2-3 seconds**
3. **Return to the app** (tap app icon or switch from task manager)
4. **Check logs** for the performance event

**Expected Event:**
```json
{
  "event_name": "faro.performance.app_launch",
  "launchType": "warm",
  "totalLaunchTime": "150"        // Much faster than cold start
}
```

**Metrics to Observe:**
- `launchType`: Should be "warm"
- `totalLaunchTime`: Should be 50-200ms (much faster than cold start)

---

### Test 3: Screen Navigation Performance

**Steps:**
1. **Launch the app**
2. **Navigate to different screens:**
   - Home → Error Demo
   - Error Demo → Console Demo
   - Console Demo → Event Demo
   - Event Demo → Tracing Demo
3. **Check Grafana Cloud** for screen performance events

**Expected Events:**
```json
// First navigation
{
  "event_name": "faro.performance.screen",
  "faroScreenId": "xyz789",
  "faroLaunchId": "abc123",
  "screenName": "ErrorDemo",
  "previousScreen": "Home",
  "faroPreviousScreenId": "def456",
  "mountTime": "156",             // Time for screen to mount (ms)
  "transitionTime": "234",        // Time from previous screen to this one (ms)
  "navigationType": "unknown"     // Would be "push" with better integration
}

// Second navigation
{
  "event_name": "faro.performance.screen",
  "faroScreenId": "ghi012",
  "faroLaunchId": "abc123",
  "screenName": "ConsoleDemo",
  "previousScreen": "ErrorDemo",
  "faroPreviousScreenId": "xyz789",
  "mountTime": "89",
  "transitionTime": "125"
}
```

**Metrics to Observe:**
- `mountTime`: How long the screen component took to mount (100-300ms typical)
- `transitionTime`: How long from previous screen unmount to new screen mount
- `faroPreviousScreenId`: Links back to previous screen for journey tracking

---

### Test 4: User Journey Tracking

**Scenario:** Track a complete user flow through multiple screens

**Steps:**
1. **Fresh app launch** (cold start)
2. **Navigate through these screens in order:**
   - Home (initial screen)
   - → Error Demo
   - → Console Demo
   - → Event Demo
   - → Tracing Demo
   - ← Back to Event Demo
   - ← Back to Console Demo
3. **Query Grafana Cloud** to see the journey

**Grafana Query (Loki):**
```logql
# Get all performance events for a single launch session
{app_name="React Native Test", kind="event"}
| json
| event_name=~"faro.performance.*"
| faroLaunchId="<your-launch-id>"
```

**Expected Journey Visualization:**
```
App Launch (cold) [abc123]
  └─> Home [def456] (initial screen, 892ms total launch)
      └─> ErrorDemo [xyz789] (mount: 156ms, transition: 234ms)
          └─> ConsoleDemo [ghi012] (mount: 89ms, transition: 125ms)
              └─> EventDemo [jkl345] (mount: 102ms, transition: 140ms)
                  └─> TracingDemo [mno678] (mount: 215ms, transition: 180ms)
```

---

## Viewing Performance Data in Grafana Cloud

### Query Templates

#### 1. Average App Launch Time by Launch Type

```logql
{app_name="React Native Test", kind="event"}
| json
| event_name="faro.performance.app_launch"
| unwrap totalLaunchTime
| avg by (launchType)
```

**Expected Results:**
- Cold starts: 800-1500ms
- Warm starts: 50-200ms

---

#### 2. Slowest Screen Navigations

```logql
{app_name="React Native Test", kind="event"}
| json
| event_name="faro.performance.screen"
| unwrap mountTime
| topk(10)
```

**Use Case:** Identify which screens are slow to render

---

#### 3. App Launch Performance Over Time

```logql
{app_name="React Native Test", kind="event"}
| json
| event_name="faro.performance.app_launch"
| unwrap totalLaunchTime
```

**Visualization:** Time series graph showing launch time trends

---

#### 4. User Journey Reconstruction

```logql
{app_name="React Native Test", kind="event"}
| json
| event_name="faro.performance.screen"
| line_format "{{screenName}} ({{mountTime}}ms) ← {{previousScreen}}"
```

**Use Case:** See the path users take through your app

---

#### 5. Cold vs Warm Start Comparison

```logql
{app_name="React Native Test", kind="event"}
| json
| event_name="faro.performance.app_launch"
| unwrap totalLaunchTime
| histogram_quantile(0.95) by (launchType)
```

**Use Case:** P95 launch times for cold vs warm starts

---

## Console Output for Testing

When testing locally, you'll see console logs like:

```
[Faro Performance] App launch performance tracked {
  launchType: 'cold',
  totalLaunchTime: '892'
}

[Faro Performance] Screen navigation performance tracked {
  screenName: 'ErrorDemo',
  mountTime: '156'
}
```

You can also use the `ConsoleTransport` to see the full event payloads:

```typescript
// In src/faro/initialize.ts
transports: [
  new FetchTransport({ url: FARO_COLLECTOR_URL }),
  new ConsoleTransport({ level: LogLevel.DEBUG }), // Add this for debugging
],
```

---

## Performance Benchmarks

### Expected Timings

| Metric | Good | Average | Poor |
|--------|------|---------|------|
| **Cold Start** | < 1000ms | 1000-2000ms | > 2000ms |
| **Warm Start** | < 150ms | 150-300ms | > 300ms |
| **JS Bundle Load** | < 300ms | 300-600ms | > 600ms |
| **Screen Mount** | < 150ms | 150-300ms | > 300ms |
| **Screen Transition** | < 200ms | 200-400ms | > 400ms |

### Factors Affecting Performance

**Cold Start:**
- Bundle size (more modules = slower)
- Native module initialization
- Device specs (older devices are slower)
- Debug vs release build (release is ~2-3x faster)

**Warm Start:**
- Should be very fast (app already in memory)
- Primarily rendering time

**Screen Navigation:**
- Component complexity
- Data fetching on mount
- Image loading
- Number of child components

---

## Troubleshooting

### Issue: No Performance Events Appearing

**Possible Causes:**
1. Performance instrumentation not enabled
2. `markAppStart()` not called in `index.js`
3. `markBundleLoaded()` not called in `App.tsx`
4. Faro not initialized
5. Session not sampled

**Solutions:**
```typescript
// Check that performance is enabled
getRNInstrumentations({
  trackPerformance: true, // Make sure this is true
})

// Check session sampling
initializeFaro({
  sessionTracking: {
    samplingRate: 1.0, // 100% of sessions (for testing)
  },
})

// Verify markers are called
console.log('App start marked:', markAppStart());
console.log('Bundle loaded marked:', markBundleLoaded());
```

---

### Issue: Timings Look Wrong (All Zero or Very Large)

**Possible Causes:**
1. Markers called in wrong order
2. Markers called multiple times
3. Clock skew

**Solutions:**
- Ensure `markAppStart()` is first thing in `index.js`
- Ensure `markBundleLoaded()` is called after imports in `App.tsx`
- Don't call markers multiple times

---

### Issue: Screen Performance Not Tracked

**Possible Causes:**
1. ViewInstrumentation not enabled
2. Screen meta not being set
3. Navigation integration missing

**Solutions:**
```typescript
// Ensure ViewInstrumentation is enabled
getRNInstrumentations({
  trackViews: true, // Required for automatic screen tracking
})

// Ensure navigation integration is set up (already done in demo)
const navigationRef = useNavigationContainerRef();
useFaroNavigation(navigationRef);
```

---

## Testing Checklist

Use this checklist to verify performance tracking:

- [ ] **Cold Start Test**
  - [ ] Close app completely
  - [ ] Reopen app
  - [ ] See `faro.performance.app_launch` event with `launchType: "cold"`
  - [ ] Verify timings are reasonable (800-1500ms total)

- [ ] **Warm Start Test**
  - [ ] Minimize app (home button)
  - [ ] Return to app
  - [ ] See `faro.performance.app_launch` event with `launchType: "warm"`
  - [ ] Verify timings are fast (50-200ms total)

- [ ] **Screen Navigation Test**
  - [ ] Navigate between 3-5 screens
  - [ ] See `faro.performance.screen` events for each navigation
  - [ ] Verify `faroPreviousScreenId` links screens together
  - [ ] Verify `mountTime` and `transitionTime` are present

- [ ] **Grafana Cloud Verification**
  - [ ] Query for app launch events
  - [ ] Query for screen navigation events
  - [ ] Verify `faroLaunchId` links related events
  - [ ] Create dashboards for performance monitoring

---

## Advanced: Creating Performance Dashboards

### Dashboard 1: App Launch Overview

**Panels:**
1. **Cold Start P95** - 95th percentile cold start time
2. **Warm Start P95** - 95th percentile warm start time
3. **Launch Time Trend** - Time series of launch times
4. **Launch Type Distribution** - Pie chart of cold vs warm

### Dashboard 2: Screen Performance

**Panels:**
1. **Slowest Screens** - Top 10 screens by mount time
2. **Screen Mount Time Trend** - Mount time over time by screen
3. **Navigation Flow** - Sankey diagram of user journeys
4. **Transition Time Distribution** - Histogram of transition times

### Dashboard 3: User Journeys

**Panels:**
1. **Common Paths** - Most frequent navigation sequences
2. **Drop-off Analysis** - Where users stop navigating
3. **Session Duration** - Time from launch to background
4. **Screens per Session** - Average number of screens visited

---

## Performance Optimization Tips

Based on the metrics you collect:

1. **If Cold Start > 2s:**
   - Reduce bundle size (code splitting, lazy loading)
   - Defer non-critical initialization
   - Profile native module initialization

2. **If Screen Mount > 300ms:**
   - Optimize component render
   - Defer data fetching
   - Use React.memo for expensive components
   - Lazy load images

3. **If Transition Time > 400ms:**
   - Reduce animation complexity
   - Optimize unmount cleanup
   - Check for blocking operations

---

## Example: Interpreting Results

### Good Performance Example

```json
{
  "event_name": "faro.performance.app_launch",
  "launchType": "cold",
  "jsBundleLoadTime": "280",      // ✅ Good - under 300ms
  "timeToFirstScreen": "850",     // ✅ Good - under 1000ms
  "totalLaunchTime": "850"
}

{
  "event_name": "faro.performance.screen",
  "screenName": "ErrorDemo",
  "mountTime": "120",              // ✅ Good - under 150ms
  "transitionTime": "180"          // ✅ Good - under 200ms
}
```

### Poor Performance Example

```json
{
  "event_name": "faro.performance.app_launch",
  "launchType": "cold",
  "jsBundleLoadTime": "890",      // ⚠️ Slow - review bundle size
  "timeToFirstScreen": "2450",    // ❌ Very slow - needs optimization
  "totalLaunchTime": "2450"
}

{
  "event_name": "faro.performance.screen",
  "screenName": "ErrorDemo",
  "mountTime": "450",              // ❌ Very slow - optimize component
  "transitionTime": "620"          // ❌ Very slow - check animations
}
```

**Action Items for Poor Performance:**
1. Profile the app with React DevTools Profiler
2. Check for unnecessary re-renders
3. Review data fetching patterns
4. Optimize images and assets
5. Consider code splitting

---

## Summary

Performance instrumentation is **automatically enabled** in the demo app. Simply:

1. ✅ Launch the app (cold start tracked automatically)
2. ✅ Navigate between screens (screen performance tracked automatically)
3. ✅ Background and return to app (warm start tracked automatically)
4. ✅ View data in Grafana Cloud using the provided queries

No additional code needed - just use the app normally and performance metrics will be collected!
