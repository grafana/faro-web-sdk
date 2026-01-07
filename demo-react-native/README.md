# Faro React Native Demo

Demo application showcasing the Grafana Faro React Native SDK.

## Prerequisites

Make sure you have completed the [Set Up Your Environment](https://reactnative.dev/docs/set-up-your-environment) guide before proceeding.

## Setup

### 1. Install dependencies

```bash
yarn install
cd ios && bundle install && bundle exec pod install && cd ..
```

### 2. Configure environment variables

Copy the `.env.example` file to `.env` and add your Grafana Cloud Faro collector URL:

```bash
cp .env.example .env
```

Edit `.env` and replace with your actual Faro collector URL from Grafana Cloud:

```
FARO_COLLECTOR_URL=https://faro-collector-prod-YOUR-REGION.grafana.net/collect/YOUR_TOKEN_HERE
```

## Features

This demo app demonstrates:

### Core Instrumentations ✅
- **Console Instrumentation**: Captures console logs, warnings, and errors
- **Errors Instrumentation**: Captures unhandled errors and promise rejections using React Native's ErrorUtils
- **Session Tracking**: Generates and tracks user sessions
- **View Instrumentation**: Tracks screen/navigation changes
- **App State Instrumentation**: Tracks when app goes to background/foreground
- **User Actions Instrumentation**: Automatic tracking of user interactions via HOC

### Faro APIs ✅
- **Custom Events**: `faro.api.pushEvent()` - Track custom user actions
- **Performance Measurements**: `faro.api.pushMeasurement()` - Track performance metrics
- **User Identification**: `faro.api.setUser()` - Associate telemetry with users
- **Manual Logs**: `faro.api.pushLog()` - Send custom log messages (captured by console)
- **Manual Errors**: `faro.api.pushError()` - Report errors manually
- **User Action Tracking**: `withFaroUserAction()` HOC and `trackUserAction()` helper

### Platform-Specific ✅
- **Device Meta**: Collects device information (model, OS version, etc.)
- **Screen Meta**: Tracks screen dimensions
- **Transport**: Sends telemetry data to Grafana Cloud via fetch
- **HTTP Request Instrumentation**: Automatic tracking of fetch/API calls with user action correlation
- **Performance Monitoring**: CPU and memory usage tracking using native OS APIs
- **Startup Instrumentation**: Automatic app startup time tracking

### Not Yet Implemented ⏳
- **OpenTelemetry Tracing**: Distributed tracing support
- **Performance Navigation Timing**: Enhanced navigation performance tracking

## Testing

### Home Screen
- **🚀 Send Test Logs** - Sends console logs and custom events. Click counter shows number of events sent. Automatically tracked with user action name `test_logs_button`.
- **👤 Set User Info** - Demonstrates user identification. All subsequent telemetry will be associated with the demo user. Automatically tracked with user action name `set_user_button`.
- **🎯 Manual User Action** - Demonstrates manual user action tracking API using `trackUserAction()` for complex workflows. Shows counter of tracked actions.
- **Navigation Buttons** - All navigation buttons (Error Demo, Performance Demo, About) are wrapped with the `withFaroUserAction` HOC and automatically track user interactions with custom action names and context.

### Error Demo Screen
- **Throw Sync Error** - Tests synchronous error capture
- **Throw Async Error** - Tests asynchronous error capture
- **Unhandled Rejection** - Tests promise rejection tracking
- **Console Error** - Tests console.error capture

### Performance Demo Screen
- **Run Heavy Computation** - Tracks and reports computation time as a measurement
- **Simulate Slow Render** - Tracks and reports render timing

## Viewing Data in Grafana Cloud

To view your telemetry data:

1. Go to your Grafana Cloud instance at `https://<your-org>.grafana.net`
2. Navigate to **Explore** (compass icon)
3. Select your **Loki** data source
4. Query your data:
   ```logql
   {app_name="React Native Test"}
   ```
5. Filter by:
   - `kind="log"` - Console logs
   - `kind="event"` - Custom events (demo_button_clicked, user_identified, etc.)
   - `kind="measurement"` - Performance measurements (heavy_computation, slow_render)
   - `kind="exception"` - Errors and exceptions
   - `kind="user_action"` - User interactions (test_logs_button, navigate_to_error_demo, complex_workflow, etc.)
   - `session_id` - Filter by specific user session
   - `user_id="demo-user-123"` - Filter by user (after clicking "Set User Info")

### User Actions in Grafana Cloud

User actions are tracked with the following data:
- **Action name**: e.g., `test_logs_button`, `navigate_to_error_demo`, `complex_workflow`
- **Trigger type**: `press` for HOC-wrapped components, `manual` for `trackUserAction()` calls
- **Context data**: Additional metadata passed via `faroContext` prop (e.g., `destination`, `eventCount`)
- **Duration**: Time from start to end of the action

Example query to see all user actions:
```logql
{app_name="React Native Test", kind="user_action"}
```

---

This is a new [**React Native**](https://reactnative.dev) project, bootstrapped using [`@react-native-community/cli`](https://github.com/react-native-community/cli).

# Getting Started

> **Note**: Make sure you have completed the [Set Up Your Environment](https://reactnative.dev/docs/set-up-your-environment) guide before proceeding.

## Step 1: Start Metro

First, you will need to run **Metro**, the JavaScript build tool for React Native.

To start the Metro dev server, run the following command from the root of your React Native project:

```sh
# Using npm
npm start

# OR using Yarn
yarn start
```

## Step 2: Build and run your app

With Metro running, open a new terminal window/pane from the root of your React Native project, and use one of the following commands to build and run your Android or iOS app:

### Android

```sh
# Using npm
npm run android

# OR using Yarn
yarn android
```

### iOS

For iOS, remember to install CocoaPods dependencies (this only needs to be run on first clone or after updating native deps).

The first time you create a new project, run the Ruby bundler to install CocoaPods itself:

```sh
bundle install
```

Then, and every time you update your native dependencies, run:

```sh
bundle exec pod install
```

For more information, please visit [CocoaPods Getting Started guide](https://guides.cocoapods.org/using/getting-started.html).

```sh
# Using npm
npm run ios

# OR using Yarn
yarn ios
```

If everything is set up correctly, you should see your new app running in the Android Emulator, iOS Simulator, or your connected device.

This is one way to run your app — you can also build it directly from Android Studio or Xcode.

## Step 3: Modify your app

Now that you have successfully run the app, let's make changes!

Open `App.tsx` in your text editor of choice and make some changes. When you save, your app will automatically update and reflect these changes — this is powered by [Fast Refresh](https://reactnative.dev/docs/fast-refresh).

When you want to forcefully reload, for example to reset the state of your app, you can perform a full reload:

- **Android**: Press the <kbd>R</kbd> key twice or select **"Reload"** from the **Dev Menu**, accessed via <kbd>Ctrl</kbd> + <kbd>M</kbd> (Windows/Linux) or <kbd>Cmd ⌘</kbd> + <kbd>M</kbd> (macOS).
- **iOS**: Press <kbd>R</kbd> in iOS Simulator.

## Congratulations! :tada:

You've successfully run and modified your React Native App. :partying_face:

### Now what?

- If you want to add this new React Native code to an existing application, check out the [Integration guide](https://reactnative.dev/docs/integration-with-existing-apps).
- If you're curious to learn more about React Native, check out the [docs](https://reactnative.dev/docs/getting-started).

# Troubleshooting

If you're having issues getting the above steps to work, see the [Troubleshooting](https://reactnative.dev/docs/troubleshooting) page.

# Learn More

To learn more about React Native, take a look at the following resources:

- [React Native Website](https://reactnative.dev) - learn more about React Native.
- [Getting Started](https://reactnative.dev/docs/environment-setup) - an **overview** of React Native and how setup your environment.
- [Learn the Basics](https://reactnative.dev/docs/getting-started) - a **guided tour** of the React Native **basics**.
- [Blog](https://reactnative.dev/blog) - read the latest official React Native **Blog** posts.
- [`@facebook/react-native`](https://github.com/facebook/react-native) - the Open Source; GitHub **repository** for React Native.
