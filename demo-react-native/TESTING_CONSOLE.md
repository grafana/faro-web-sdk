# Testing Console Instrumentation in Faro React Native Demo

This guide explains how to test the enhanced Console instrumentation features including advanced error serialization, stack frame extraction, and custom serializers.

## What is Console Instrumentation?

Console instrumentation captures console logs, warnings, and errors from your React Native app and sends them to Grafana Cloud. The enhanced version includes:

- **Advanced Error Serialization**: Extracts detailed error information including stack frames
- **React Native Stack Parsing**: Parses React Native-specific stack trace formats
- **Configurable Log Levels**: Control which console methods to capture
- **Flexible Error Handling**: Send console.error as errors or logs
- **Custom Serializers**: Provide custom logic for serializing console arguments
- **Unpatch Support**: Clean console restoration when needed

## Prerequisites

The app should already be running from previous testing. If not, follow the setup steps in `TESTING_NAVIGATION.md` first.

## Test Scenarios

### 1. Basic Console Logging

Test that basic console methods are captured:

**In the demo app, add these test buttons to a screen (e.g., HomeScreen):**

```tsx
import { faro } from '@grafana/faro-react-native';

// Add these test functions
const testBasicLogging = () => {
  console.log('Test log message');
  console.info('Test info message');
  console.warn('Test warning message');
  console.error('Test error message');
};

// Add button in your component
<Button title="Test Basic Logging" onPress={testBasicLogging} />
```

**Expected in Grafana Cloud:**
- Log entries with different levels (log, info, warn, error)
- Error message appears in errors view (if `consoleErrorAsLog: false`)

### 2. Error Object Serialization

Test that Error objects are properly serialized with stack frames:

```tsx
const testErrorSerialization = () => {
  const error = new Error('This is a test error with stack');
  console.error(error);

  // Test with additional context
  console.error('Error occurred:', error);

  // Test with TypeError
  const typeError = new TypeError('Type error test');
  console.error(typeError);
};

<Button title="Test Error Serialization" onPress={testErrorSerialization} />
```

**Expected in Grafana Cloud:**
- Error entries with `type` field (e.g., "Error", "TypeError")
- Stack frames with filename, function, line, and column information
- Proper error message extraction

### 3. Stack Frame Parsing

Test React Native-specific stack trace parsing:

```tsx
const helperFunction = () => {
  throw new Error('Error from helper function');
};

const anotherHelper = () => {
  helperFunction();
};

const testStackFrames = () => {
  try {
    anotherHelper();
  } catch (error) {
    console.error('Caught error:', error);
  }
};

<Button title="Test Stack Frames" onPress={testStackFrames} />
```

**Expected in Grafana Cloud:**
- Stack frames showing the call chain: `testStackFrames` → `anotherHelper` → `helperFunction`
- Proper filename, line numbers, and column numbers
- Function names properly extracted

### 4. Console Error as Log

Test the `consoleErrorAsLog` configuration option:

**Update your Faro initialization in `src/faro/initialize.ts`:**

```tsx
initializeFaro({
  // ... other config
  consoleInstrumentation: {
    consoleErrorAsLog: true,  // Treat console.error as logs
  },
});
```

**Then test:**

```tsx
const testConsoleErrorAsLog = () => {
  console.error('This should appear as a log, not an error');
  console.error(new Error('Error object as log'));
};

<Button title="Test Console Error As Log" onPress={testConsoleErrorAsLog} />
```

**Expected in Grafana Cloud:**
- console.error appears in **logs** view instead of **errors** view
- Error details available in log context

### 5. Custom Error Serializer

Test custom serializer for special formatting:

**Update Faro initialization:**

```tsx
initializeFaro({
  // ... other config
  consoleInstrumentation: {
    serializeErrors: true,
    errorSerializer: (args) => {
      return args.map(arg => {
        if (typeof arg === 'object' && arg !== null) {
          return `[OBJECT] ${JSON.stringify(arg, null, 2)}`;
        }
        return `[${typeof arg}] ${String(arg)}`;
      }).join(' | ');
    },
  },
});
```

**Then test:**

```tsx
const testCustomSerializer = () => {
  console.error('Custom serializer test', { userId: 123, action: 'test' });
  console.error(new Error('Error with custom serialization'));
};

<Button title="Test Custom Serializer" onPress={testCustomSerializer} />
```

**Expected in Grafana Cloud:**
- Error messages formatted according to your custom serializer
- Type prefixes like `[OBJECT]` and `[object]` visible

### 6. Disabled Log Levels

Test that certain log levels can be disabled:

**Update Faro initialization:**

```tsx
import { LogLevel } from '@grafana/faro-react-native';

initializeFaro({
  // ... other config
  consoleInstrumentation: {
    disabledLevels: [LogLevel.DEBUG, LogLevel.TRACE, LogLevel.LOG],  // Disable debug, trace, and log
  },
});
```

**Then test:**

```tsx
const testDisabledLevels = () => {
  console.log('This should NOT be captured');
  console.debug('This should NOT be captured');
  console.info('This SHOULD be captured');
  console.warn('This SHOULD be captured');
  console.error('This SHOULD be captured');
};

<Button title="Test Disabled Levels" onPress={testDisabledLevels} />
```

**Expected in Grafana Cloud:**
- Only info, warn, and error messages appear
- log and debug messages are NOT captured

### 7. Complex Error Objects

Test with complex error scenarios:

```tsx
const testComplexErrors = () => {
  // Error with properties
  const error = new Error('Error with custom properties');
  (error as any).code = 'AUTH_FAILED';
  (error as any).statusCode = 401;
  console.error('Authentication error:', error);

  // Multiple arguments
  console.error('Multiple args:', new Error('Test'), { context: 'payment' }, 'Additional info');

  // Error-like object
  console.error({ message: 'Custom error object', stack: 'fake stack trace' });
};

<Button title="Test Complex Errors" onPress={testComplexErrors} />
```

**Expected in Grafana Cloud:**
- All error variations captured
- Custom properties may be serialized (depending on serializer)
- Multiple arguments handled correctly

### 8. Unpatch Console

Test that console can be unpatched:

```tsx
import { faro } from '@grafana/faro-react-native';

const testUnpatch = () => {
  console.log('This should be captured - BEFORE unpatch');

  // Get the console instrumentation and unpatch it
  const consoleInstrumentation = faro.instrumentations.instrumentations.find(
    i => i.name === '@grafana/faro-react-native:instrumentation-console'
  );

  if (consoleInstrumentation && 'unpatch' in consoleInstrumentation) {
    (consoleInstrumentation as any).unpatch();
  }

  console.log('This should NOT be captured - AFTER unpatch');
  console.error('This error should NOT be captured - AFTER unpatch');
};

<Button title="Test Unpatch" onPress={testUnpatch} />
```

**Expected in Grafana Cloud:**
- Only the first log message appears
- Messages after unpatch are NOT captured
- Console still works normally (messages appear in React Native debugger)

**Note**: After unpatching, you'll need to restart the app to re-enable console instrumentation.

## Viewing Data in Grafana Cloud

### 1. Access Grafana Cloud Explore

1. Go to your Grafana Cloud instance: `https://YOUR-ORG.grafana.net`
2. Navigate to **Explore** (compass icon in left sidebar)
3. Select your **Loki** data source from the dropdown

### 2. Query Console Logs

#### View All Console Logs

```logql
{service_name="React Native Test", kind="log"}
| logfmt
| line_format "{{.level}}: {{.message}}"
```

#### View Console Errors (as errors)

```logql
{service_name="React Native Test", kind="exception"}
| logfmt
| line_format "{{.type}}: {{.value}}"
```

#### View Console Errors with Stack Frames

```logql
{service_name="React Native Test", kind="exception"}
| logfmt
| line_format "{{.type}}: {{.value}}\nStack: {{.stackFrames}}"
```

#### Filter by Log Level

```logql
{service_name="React Native Test", kind="log"}
| logfmt
| level="warn"
```

#### View Errors with "console.error:" prefix

```logql
{service_name="React Native Test", kind="exception"}
| logfmt
| value =~ "console.error:.*"
```

### 3. Advanced Queries

#### Count Logs by Level

```logql
sum by (level) (
  count_over_time(
    {service_name="React Native Test", kind="log"}
    | logfmt
    [24h]
  )
)
```

#### Count Errors by Type

```logql
sum by (type) (
  count_over_time(
    {service_name="React Native Test", kind="exception"}
    | logfmt
    | type != ""
    [24h]
  )
)
```

#### Find Errors with Stack Frames

```logql
{service_name="React Native Test", kind="exception"}
| logfmt
| stackFrames != ""
```

## Configuration Examples

### Example 1: Capture Everything

```tsx
import { initializeFaro, LogLevel } from '@grafana/faro-react-native';

initializeFaro({
  url: 'https://your-faro-collector-url',
  app: {
    name: 'my-app',
    version: '1.0.0',
  },
  consoleInstrumentation: {
    disabledLevels: [],  // Capture all levels
    serializeErrors: true,  // Extract stack frames
  },
});
```

### Example 2: Production-Optimized

```tsx
initializeFaro({
  url: 'https://your-faro-collector-url',
  app: {
    name: 'my-app',
    version: '1.0.0',
  },
  consoleInstrumentation: {
    disabledLevels: [LogLevel.DEBUG, LogLevel.TRACE, LogLevel.LOG],  // Only capture info, warn, error
    serializeErrors: true,  // Extract stack frames
    consoleErrorAsLog: false,  // Send console.error as errors (default)
  },
});
```

### Example 3: Development-Friendly

```tsx
initializeFaro({
  url: 'https://your-faro-collector-url',
  app: {
    name: 'my-app',
    version: '1.0.0',
  },
  consoleInstrumentation: {
    disabledLevels: [],  // Capture everything
    serializeErrors: true,  // Extract stack frames
    consoleErrorAsLog: true,  // Send console.error as logs for easier filtering
    errorSerializer: (args) => {
      // Pretty print for development
      return args.map(arg => {
        if (typeof arg === 'object') {
          return JSON.stringify(arg, null, 2);
        }
        return String(arg);
      }).join('\n');
    },
  },
});
```

## Expected Results

After testing all scenarios, you should see in Grafana Cloud:

- ✅ Console logs with different levels (log, info, warn, error)
- ✅ Console errors with extracted stack frames
- ✅ Error type information (Error, TypeError, etc.)
- ✅ Stack frames with filename, function, line, column
- ✅ Custom serializer formatting (if configured)
- ✅ Disabled log levels not appearing
- ✅ console.error as logs (if `consoleErrorAsLog: true`)

## Troubleshooting

### Console Logs Not Appearing?

**Check 1: Verify console instrumentation is enabled**
```tsx
getRNInstrumentations({
  captureConsole: true,  // Must be true
})
```

**Check 2: Check disabled levels**
Make sure the log level you're testing isn't in `disabledLevels`.

**Check 3: Check Faro initialization logs**
Look for: `[Faro] Console instrumentation initialized`

### Stack Frames Not Appearing?

**Check 1: Enable serializeErrors**
```tsx
consoleInstrumentation: {
  serializeErrors: true,  // Must be enabled
}
```

**Check 2: Verify you're passing Error objects**
Stack frames only work with actual Error objects, not strings:
```tsx
console.error(new Error('message'));  // ✅ Will have stack frames
console.error('message');  // ❌ No stack frames
```

### Console Still Capturing After Unpatch?

Make sure you're calling `unpatch()` on the correct instrumentation instance and that it has the `unpatch` method.

## Next Steps

Once console instrumentation is working:
1. Configure log levels for production vs development
2. Set up alerts for specific error types
3. Create dashboards for log volume and error rates
4. Correlate console errors with user actions and navigation
5. Use custom serializers to add contextual information

## Support

If you encounter issues:
1. Check the main README: `/demo-react-native/README.md`
2. Review the React Native SDK docs: `packages/react-native/README.md`
3. Open an issue on GitHub
