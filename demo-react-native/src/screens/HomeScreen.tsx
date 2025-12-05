import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import React from 'react';
import {
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';

import type { RootStackParamList } from '../navigation/AppNavigator';

type Props = NativeStackScreenProps<RootStackParamList, 'Home'>;

export function HomeScreen({ navigation }: Props) {

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <Text style={styles.title}>Faro React Native Demo</Text>
      <Text style={styles.subtitle}>
        Welcome to the Grafana Faro React Native SDK Demo
      </Text>

      <View style={styles.buttonContainer}>
        <TouchableOpacity
          style={[styles.button, styles.showcaseButton]}
          onPress={() => navigation.navigate('Showcase')}
        >
          <Text style={styles.buttonText}>✨ SDK Showcase</Text>
          <Text style={styles.buttonDescription}>
            Demo all features with different user profiles - Perfect for
            presentations!
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.button, styles.errorButton]}
          onPress={() => navigation.navigate('ErrorDemo')}
        >
          <Text style={styles.buttonText}>Error Demo</Text>
          <Text style={styles.buttonDescription}>
            Test error capture and reporting
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.button, styles.performanceButton]}
          onPress={() => navigation.navigate('PerformanceDemo')}
        >
          <Text style={styles.buttonText}>Performance Demo</Text>
          <Text style={styles.buttonDescription}>
            Test performance monitoring
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
          style={[styles.button, styles.aboutButton]}
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
    backgroundColor: '#28a745',
  },
  errorButton: {
    backgroundColor: '#dc3545',
  },
  performanceButton: {
    backgroundColor: '#007bff',
  },
  consoleTestButton: {
    backgroundColor: '#6f42c1',
  },
  deviceInfoButton: {
    backgroundColor: '#fd7e14',
  },
  tracingButton: {
    backgroundColor: '#20c997',
  },
  aboutButton: {
    backgroundColor: '#6c757d',
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
