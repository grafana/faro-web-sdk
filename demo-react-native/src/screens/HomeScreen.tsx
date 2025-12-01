import React, {useState} from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
} from 'react-native';
import type {NativeStackScreenProps} from '@react-navigation/native-stack';
import type {RootStackParamList} from '../navigation/AppNavigator';
import {
  faro,
  trackUserAction,
} from '@grafana/faro-react-native';

type Props = NativeStackScreenProps<RootStackParamList, 'Home'>;

export function HomeScreen({navigation}: Props) {
  const [eventCount, setEventCount] = useState(0);
  const [userSet, setUserSet] = useState(false);
  const [userActionCount, setUserActionCount] = useState(0);

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
      // TODO: Export UserActionInternalInterface from @grafana/faro-react-native to avoid direct core import
      if (action) {
        (action as any).end();
      }
      setUserActionCount(prev => prev + 1);
    }, 100);
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

      <View style={styles.buttonContainer}>
        <TouchableOpacity
          style={[styles.button, styles.testButton]}
          onPress={handleTestLog}>
          <Text style={styles.buttonText}>
            🚀 Send Test Logs {eventCount > 0 && `(${eventCount})`}
          </Text>
          <Text style={styles.buttonDescription}>
            Send sample logs and events to Grafana Cloud
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.button, userSet ? styles.userSetButton : styles.userButton]}
          onPress={handleSetUser}
          disabled={userSet}>
          <Text style={styles.buttonText}>
            👤 {userSet ? 'User Set ✓' : 'Set User Info'}
          </Text>
          <Text style={styles.buttonDescription}>
            {userSet ? 'User tracking enabled' : 'Enable user identification'}
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.button, styles.manualActionButton]}
          onPress={handleManualUserAction}>
          <Text style={styles.buttonText}>
            🎯 Manual User Action
          </Text>
          <Text style={styles.buttonDescription}>
            Demonstrates manual user action tracking API
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.button}
          onPress={() => navigation.navigate('ErrorDemo')}>
          <Text style={styles.buttonText}>Error Demo</Text>
          <Text style={styles.buttonDescription}>
            Test error capture and reporting
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.button}
          onPress={() => navigation.navigate('PerformanceDemo')}>
          <Text style={styles.buttonText}>Performance Demo</Text>
          <Text style={styles.buttonDescription}>
            Test performance monitoring
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.button}
          onPress={() => navigation.navigate('About')}>
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
    shadowOffset: {width: 0, height: 2},
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
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
