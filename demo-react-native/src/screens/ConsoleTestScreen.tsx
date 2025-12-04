import React from 'react';
import {
  Alert,
  Button,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';

import { faro } from '@grafana/faro-react-native';

/**
 * Console Instrumentation Test Screen
 *
 * Tests all enhanced console instrumentation features:
 * - Basic console logging (log, info, warn, error)
 * - Error object serialization with stack frames
 * - Stack frame parsing
 * - Complex error scenarios
 * - Unpatch functionality
 */
export default function ConsoleTestScreen() {
  // Test 1: Basic Console Logging
  const testBasicLogging = () => {
    console.log('✅ Test log message');
    console.info('ℹ️ Test info message');
    console.warn('⚠️ Test warning message');
    console.error('❌ Test error message');
    Alert.alert(
      'Success',
      'Basic logging test completed. Check Grafana Cloud.',
    );
  };

  // Test 2: Error Object Serialization
  const testErrorSerialization = () => {
    const error = new Error('This is a test error with stack');
    console.error(error);

    // Test with additional context
    console.error('Error occurred:', error);

    // Test with TypeError
    const typeError = new TypeError('Type error test');
    console.error(typeError);

    // Test with RangeError
    const rangeError = new RangeError('Range error test');
    console.error(rangeError);

    Alert.alert(
      'Success',
      'Error serialization test completed. Check Grafana Cloud for stack frames.',
    );
  };

  // Test 3: Stack Frame Parsing
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
      console.error('Caught error with call stack:', error);
      Alert.alert(
        'Success',
        'Stack frame test completed. Check Grafana Cloud for call chain.',
      );
    }
  };

  // Test 4: Complex Error Objects
  const testComplexErrors = () => {
    // Error with custom properties
    const error = new Error('Error with custom properties') as any;
    error.code = 'AUTH_FAILED';
    error.statusCode = 401;
    console.error('Authentication error:', error);

    // Multiple arguments
    console.error(
      'Multiple args:',
      new Error('Test'),
      { context: 'payment' },
      'Additional info',
    );

    // Error-like object
    console.error({
      message: 'Custom error object',
      stack: 'fake stack trace',
    });

    // Array and object logging
    console.error('Array:', [1, 2, 3]);
    console.error('Object:', { user: 'test', action: 'login' });

    Alert.alert(
      'Success',
      'Complex errors test completed. Check Grafana Cloud.',
    );
  };

  // Test 5: Nested Function Calls (Deep Stack)
  const level3 = () => {
    throw new Error('Error from deeply nested function (level 3)');
  };

  const level2 = () => {
    level3();
  };

  const level1 = () => {
    level2();
  };

  const testDeepStack = () => {
    try {
      level1();
    } catch (error) {
      console.error('Deep stack trace error:', error);
      Alert.alert(
        'Success',
        'Deep stack test completed. Check Grafana Cloud for full call chain.',
      );
    }
  };

  // Test 6: Different Log Levels
  const testLogLevels = () => {
    console.debug('🐛 Debug message (may be disabled)');
    console.log('📝 Log message (may be disabled)');
    console.info('ℹ️ Info message');
    console.warn('⚠️ Warning message');
    console.error('❌ Error message');

    Alert.alert(
      'Success',
      'Log levels test completed. Debug and log may be disabled by default. Check Grafana Cloud.',
    );
  };

  // Test 7: Error with Context
  const testErrorWithContext = () => {
    const userId = 'user_123';
    const action = 'payment_processing';

    try {
      // Simulate an error
      throw new Error('Payment processing failed');
    } catch (error) {
      console.error(`[${action}] Error for user ${userId}:`, error);
      Alert.alert(
        'Success',
        'Error with context test completed. Check Grafana Cloud.',
      );
    }
  };

  // Test 8: Unpatch Console
  const testUnpatch = () => {
    console.log('✅ This should be captured - BEFORE unpatch');

    // Get the console instrumentation and unpatch it
    const consoleInstrumentation =
      faro.instrumentations?.instrumentations?.find(
        (i: any) =>
          i.name === '@grafana/faro-react-native:instrumentation-console',
      );

    if (consoleInstrumentation && 'unpatch' in consoleInstrumentation) {
      (consoleInstrumentation as any).unpatch();
      console.log('❌ This should NOT be captured - AFTER unpatch');
      console.error('❌ This error should NOT be captured - AFTER unpatch');

      Alert.alert(
        'Success',
        'Unpatch test completed. Only the first message should appear in Grafana Cloud. Restart app to re-enable console instrumentation.',
      );
    } else {
      Alert.alert('Error', 'Could not find console instrumentation');
    }
  };

  // Test 9: Promise Rejection
  const testPromiseRejection = () => {
    Promise.reject(new Error('Test promise rejection')).catch((error) => {
      console.error('Promise rejection caught:', error);
    });

    Alert.alert(
      'Success',
      'Promise rejection test completed. Check Grafana Cloud.',
    );
  };

  // Test 10: Async Error
  const testAsyncError = async () => {
    try {
      await new Promise((_, reject) => {
        setTimeout(() => {
          reject(new Error('Async operation failed'));
        }, 100);
      });
    } catch (error) {
      console.error('Async error caught:', error);
      Alert.alert(
        'Success',
        'Async error test completed. Check Grafana Cloud.',
      );
    }
  };

  return (
    <ScrollView style={styles.container}>
      <View style={styles.content}>
        <Text style={styles.title}>Console Instrumentation Tests</Text>
        <Text style={styles.description}>
          Test enhanced console instrumentation features. After each test, check
          Grafana Cloud to verify the data was captured correctly.
        </Text>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Basic Tests</Text>

          <View style={styles.buttonContainer}>
            <Button title="1. Basic Logging" onPress={testBasicLogging} />
          </View>

          <View style={styles.buttonContainer}>
            <Button
              title="2. Error Serialization"
              onPress={testErrorSerialization}
            />
          </View>

          <View style={styles.buttonContainer}>
            <Button title="3. Stack Frames" onPress={testStackFrames} />
          </View>

          <View style={styles.buttonContainer}>
            <Button title="4. Log Levels" onPress={testLogLevels} />
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Advanced Tests</Text>

          <View style={styles.buttonContainer}>
            <Button title="5. Complex Errors" onPress={testComplexErrors} />
          </View>

          <View style={styles.buttonContainer}>
            <Button title="6. Deep Stack Trace" onPress={testDeepStack} />
          </View>

          <View style={styles.buttonContainer}>
            <Button
              title="7. Error with Context"
              onPress={testErrorWithContext}
            />
          </View>

          <View style={styles.buttonContainer}>
            <Button
              title="8. Promise Rejection"
              onPress={testPromiseRejection}
            />
          </View>

          <View style={styles.buttonContainer}>
            <Button title="9. Async Error" onPress={testAsyncError} />
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Cleanup Tests</Text>

          <View style={styles.buttonContainer}>
            <Button
              title="⚠️ 10. Unpatch Console"
              onPress={testUnpatch}
              color="red"
            />
          </View>
          <Text style={styles.warning}>
            ⚠️ Warning: Unpatch will disable console tracking. Restart app to
            re-enable.
          </Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Test Instructions</Text>
          <Text style={styles.instructions}>
            1. Press a test button{'\n'}
            2. Wait for success alert{'\n'}
            3. Go to Grafana Cloud Explore{'\n'}
            4. Query logs/errors:{'\n'}
            {'\n'}
            Logs: {`{service_name="React Native Test", kind="log"}`}
            {'\n'}
            {'\n'}
            Errors: {`{service_name="React Native Test", kind="exception"}`}
            {'\n'}
            {'\n'}
            5. Verify data appears with correct stack frames{'\n'}
            {'\n'}
            See TESTING_CONSOLE.md for detailed testing guide.
          </Text>
        </View>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  content: {
    padding: 20,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 10,
    color: '#333',
  },
  description: {
    fontSize: 14,
    color: '#666',
    marginBottom: 20,
    lineHeight: 20,
  },
  section: {
    marginBottom: 30,
    backgroundColor: '#fff',
    padding: 15,
    borderRadius: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 15,
    color: '#333',
  },
  buttonContainer: {
    marginBottom: 10,
  },
  warning: {
    marginTop: 10,
    fontSize: 12,
    color: '#ff6b6b',
    fontStyle: 'italic',
  },
  instructions: {
    fontSize: 12,
    color: '#666',
    lineHeight: 18,
    fontFamily: 'monospace',
  },
});
