import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Alert,
} from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { RootStackParamList } from '../navigation/AppNavigator';
import { faro, trackUserAction } from '@grafana/faro-react-native';
import { UserActionInternalInterface } from '@grafana/faro-core';

type Props = NativeStackScreenProps<RootStackParamList, 'Home'>;

export function HomeScreen({ navigation }: Props) {
  const [eventCount, setEventCount] = useState(0);
  const [userSet, setUserSet] = useState(false);
  const [userActionCount, setUserActionCount] = useState(0);
  const [httpRequestCount, setHttpRequestCount] = useState(0);
  const [httpLoading, setHttpLoading] = useState(false);

  const handleTestLog = () => {
    // Send console logs (captured by ConsoleInstrumentation)
    console.log('Test log from Faro React Native!');
    console.warn('Test warning from Faro React Native!');
    console.info('Test info from Faro React Native!');

    // Send a custom event
    const count = eventCount + 1;
    faro.api.pushEvent('demo_button_clicked', {
      clickCount: String(count),
      timestamp: new Date().toISOString(),
    });

    setEventCount(count);
  };

  const handleSetUser = () => {
    // Set user identification
    faro.api.setUser({
      id: 'demo-user-123',
      username: 'demo_user',
      email: 'demo@example.com',
      attributes: {
        plan: 'premium',
        signupDate: '2024-01-01',
      },
    });

    faro.api.pushEvent('user_identified', {
      userId: 'demo-user-123',
    });

    setUserSet(true);
  };

  const handleManualUserAction = () => {
    // Example of manual user action tracking for complex workflows
    const action = trackUserAction('complex_workflow', {
      step: 'demonstration',
      screenName: 'Home',
    });

    // Simulate some work
    setTimeout(() => {
      // End the action when done
      if (action) {
        (action as UserActionInternalInterface).end();
      }
      setUserActionCount(prev => prev + 1);
    }, 100);
  };

  const handleTestHttp = async () => {
    setHttpLoading(true);
    try {
      // Test successful HTTP request
      const response = await fetch('https://jsonplaceholder.typicode.com/posts/1');
      const data = await response.json();
      console.log('HTTP test successful:', data);

      faro.api.pushEvent('http_test_completed', {
        status: 'success',
        statusCode: String(response.status),
      });

      setHttpRequestCount(prev => prev + 1);
    } catch (error) {
      console.error('HTTP test failed:', error);

      faro.api.pushEvent('http_test_completed', {
        status: 'error',
        error: error instanceof Error ? error.message : 'Unknown error',
      });
    } finally {
      setHttpLoading(false);
    }
  };


  return (
    <ScrollView contentContainerStyle={styles.container}>
      <Text style={styles.title}>Faro React Native Demo</Text>
      <Text style={styles.subtitle}>
        Welcome to the Grafana Faro React Native SDK Demo
      </Text>

      {userActionCount > 0 && (
        <View style={styles.infoBox}>
          <Text style={styles.infoText}>
            ✅ User Actions Tracked: {userActionCount}
          </Text>
          <Text style={styles.infoSubtext}>
            All button presses are automatically tracked!
          </Text>
        </View>
      )}

      {httpRequestCount > 0 && (
        <View style={[styles.infoBox, styles.httpInfoBox]}>
          <Text style={styles.infoText}>
            🌐 HTTP Requests: {httpRequestCount}
          </Text>
          <Text style={styles.infoSubtext}>
            Fetch API calls are automatically monitored!
          </Text>
        </View>
      )}

      <View style={styles.buttonContainer}>
        <TouchableOpacity
          style={[styles.button, styles.showcaseButton]}
          onPress={() => navigation.navigate('Showcase')}
        >
          <Text style={styles.buttonText}>✨ SDK Showcase</Text>
          <Text style={styles.buttonDescription}>
            Demo all features with different user profiles - Perfect for presentations!
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.button, styles.testButton]}
          onPress={handleTestLog}
        >
          <Text style={styles.buttonText}>
            🚀 Send Test Logs {eventCount > 0 && `(${eventCount})`}
          </Text>
          <Text style={styles.buttonDescription}>
            Send sample logs and events to Grafana Cloud
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[
            styles.button,
            userSet ? styles.userSetButton : styles.userButton,
          ]}
          onPress={handleSetUser}
          disabled={userSet}
        >
          <Text style={styles.buttonText}>
            👤 {userSet ? 'User Set ✓' : 'Set User Info'}
          </Text>
          <Text style={styles.buttonDescription}>
            {userSet ? 'User tracking enabled' : 'Enable user identification'}
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.button, styles.manualActionButton]}
          onPress={handleManualUserAction}
        >
          <Text style={styles.buttonText}>🎯 Manual User Action</Text>
          <Text style={styles.buttonDescription}>
            Demonstrates manual user action tracking API
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.button, styles.httpButton]}
          onPress={handleTestHttp}
          disabled={httpLoading}
        >
          <Text style={styles.buttonText}>
            🌐 {httpLoading ? 'Testing...' : 'Test HTTP Request'}{' '}
            {httpRequestCount > 0 && `(${httpRequestCount})`}
          </Text>
          <Text style={styles.buttonDescription}>
            {httpLoading
              ? 'Making HTTP request...'
              : 'Test automatic HTTP/fetch monitoring'}
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.button}
          onPress={() => navigation.navigate('ErrorDemo')}
        >
          <Text style={styles.buttonText}>Error Demo</Text>
          <Text style={styles.buttonDescription}>
            Test error capture and reporting
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.button}
          onPress={() => navigation.navigate('ErrorBoundaryDemo')}
        >
          <Text style={styles.buttonText}>Error Boundary Demo</Text>
          <Text style={styles.buttonDescription}>
            Test React Error Boundary with Faro
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.button}
          onPress={() => navigation.navigate('PerformanceDemo')}
        >
          <Text style={styles.buttonText}>Performance Demo</Text>
          <Text style={styles.buttonDescription}>
            Test performance monitoring
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.button, styles.slowLoadButton]}
          onPress={() => navigation.navigate('SlowLoadDemo')}
        >
          <Text style={styles.buttonText}>🐌 Slow Load Demo</Text>
          <Text style={styles.buttonDescription}>
            2.5s delayed screen - see performance metrics in Grafana Cloud
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.button, styles.consoleTestButton]}
          onPress={() => navigation.navigate('ConsoleTest')}
        >
          <Text style={styles.buttonText}>🔧 Console Tests</Text>
          <Text style={styles.buttonDescription}>
            Test advanced console instrumentation features
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.button, styles.deviceInfoButton]}
          onPress={() => navigation.navigate('DeviceInfo')}
        >
          <Text style={styles.buttonText}>📱 Device Info</Text>
          <Text style={styles.buttonDescription}>
            View enhanced device metadata collection
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.button, styles.tracingButton]}
          onPress={() => navigation.navigate('TracingDemo')}
        >
          <Text style={styles.buttonText}>🔍 Tracing Demo</Text>
          <Text style={styles.buttonDescription}>
            Test distributed tracing with trace ID display
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.button}
          onPress={() => navigation.navigate('About')}
        >
          <Text style={styles.buttonText}>About</Text>
          <Text style={styles.buttonDescription}>
            About this demo application
          </Text>
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flexGrow: 1,
    padding: 20,
    backgroundColor: '#fff',
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    marginBottom: 8,
    color: '#333',
  },
  subtitle: {
    fontSize: 16,
    marginBottom: 20,
    color: '#666',
  },
  infoBox: {
    backgroundColor: '#e6f7ff',
    padding: 16,
    borderRadius: 8,
    marginBottom: 20,
    borderLeftWidth: 4,
    borderLeftColor: '#1890ff',
  },
  httpInfoBox: {
    backgroundColor: '#f0fdf4',
    borderLeftColor: '#10b981',
  },
  infoText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1890ff',
    marginBottom: 4,
  },
  infoSubtext: {
    fontSize: 14,
    color: '#666',
  },
  buttonContainer: {
    gap: 16,
  },
  button: {
    backgroundColor: '#FF5F00',
    padding: 20,
    borderRadius: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  showcaseButton: {
    backgroundColor: '#d946ef',
    borderWidth: 2,
    borderColor: '#a21caf',
  },
  testButton: {
    backgroundColor: '#00D7C7',
  },
  userButton: {
    backgroundColor: '#6366f1',
  },
  userSetButton: {
    backgroundColor: '#10b981',
  },
  manualActionButton: {
    backgroundColor: '#8b5cf6',
  },
  httpButton: {
    backgroundColor: '#10b981',
  },
  slowLoadButton: {
    backgroundColor: '#ec4899',
  },
  consoleTestButton: {
    backgroundColor: '#f59e0b',
  },
  deviceInfoButton: {
    backgroundColor: '#3b82f6',
  },
  tracingButton: {
    backgroundColor: '#14b8a6',
  },
  buttonText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#fff',
    marginBottom: 4,
  },
  buttonDescription: {
    fontSize: 14,
    color: '#ffe6d5',
  },
});
