import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
} from 'react-native';

export function ErrorDemoScreen() {
  const throwSyncError = () => {
    throw new Error('This is a synchronous error for testing');
  };

  const throwAsyncError = async () => {
    // @ts-expect-error - React Native 19 has stricter setTimeout types
    await new Promise(resolve => setTimeout(resolve, 100));
    throw new Error('This is an async error for testing');
  };

  const triggerUnhandledRejection = () => {
    Promise.reject(new Error('This is an unhandled promise rejection'));
  };

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <Text style={styles.title}>Error Demo</Text>
      <Text style={styles.description}>
        Test various error scenarios to see how Faro captures and reports them.
      </Text>

      <View style={styles.buttonContainer}>
        <TouchableOpacity
          style={styles.button}
          onPress={throwSyncError}>
          <Text style={styles.buttonText}>Throw Sync Error</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.button}
          onPress={throwAsyncError}>
          <Text style={styles.buttonText}>Throw Async Error</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.button}
          onPress={triggerUnhandledRejection}>
          <Text style={styles.buttonText}>Unhandled Rejection</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.button, styles.buttonLog]}
          onPress={() => console.error('Test console error')}>
          <Text style={styles.buttonText}>Console Error</Text>
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
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 8,
    color: '#333',
  },
  description: {
    fontSize: 14,
    marginBottom: 24,
    color: '#666',
    lineHeight: 20,
  },
  buttonContainer: {
    gap: 12,
  },
  button: {
    backgroundColor: '#dc3545',
    padding: 16,
    borderRadius: 8,
    alignItems: 'center',
  },
  buttonLog: {
    backgroundColor: '#6c757d',
  },
  buttonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#fff',
  },
});
