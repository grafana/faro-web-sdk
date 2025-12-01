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
import {faro} from '@grafana/faro-react-native';

type Props = NativeStackScreenProps<RootStackParamList, 'Home'>;

export function HomeScreen({navigation}: Props) {
  const [eventCount, setEventCount] = useState(0);
  const [userSet, setUserSet] = useState(false);

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

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <Text style={styles.title}>Faro React Native Demo</Text>
      <Text style={styles.subtitle}>
        Welcome to the Grafana Faro React Native SDK Demo
      </Text>

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
    marginBottom: 32,
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
