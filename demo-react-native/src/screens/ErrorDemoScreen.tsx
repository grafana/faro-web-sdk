import React, { useState } from 'react';
import {
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';

import { FaroErrorBoundary } from '@grafana/faro-react-native';

/**
 * Component that throws an error when rendered
 */
function BrokenComponent({ shouldThrow }: { shouldThrow: boolean }) {
  if (shouldThrow) {
    throw new Error('Intentional error from BrokenComponent for testing!');
  }

  return (
    <View style={styles.successBox}>
      <Text style={styles.successText}>✅ Component rendered successfully</Text>
    </View>
  );
}

/**
 * Fallback UI shown when an error is caught
 */
function ErrorFallback({
  error,
  resetError,
}: {
  error?: Error | null;
  resetError: () => void;
}) {
  if (!error) {
    return (
      <View style={styles.errorContainer}>
        <Text style={styles.errorTitle}>❌ Unknown Error</Text>
        <Text style={styles.errorMessage}>
          An error occurred but no details are available
        </Text>
        <TouchableOpacity style={styles.resetButton} onPress={resetError}>
          <Text style={styles.resetButtonText}>🔄 Reset and Try Again</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={styles.errorContainer}>
      <Text style={styles.errorTitle}>❌ Error Caught!</Text>
      <Text style={styles.errorMessage}>{error.message}</Text>
      <TouchableOpacity style={styles.resetButton} onPress={resetError}>
        <Text style={styles.resetButtonText}>🔄 Reset and Try Again</Text>
      </TouchableOpacity>
    </View>
  );
}

export function ErrorDemoScreen() {
  const [shouldThrowError, setShouldThrowError] = useState(false);
  const [boundaryKey, setBoundaryKey] = useState(0);

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

  const handleTriggerError = () => {
    setShouldThrowError(true);
  };

  const handleReset = () => {
    setShouldThrowError(false);
    // Force error boundary to reset by changing key
    setBoundaryKey(prev => prev + 1);
  };

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <Text style={styles.title}>Error Demo</Text>
      <Text style={styles.description}>
        Test various error scenarios to see how Faro captures and reports them.
      </Text>

      {/* Direct Errors Section */}
      <Text style={styles.sectionTitle}>Direct Errors</Text>
      <View style={styles.buttonContainer}>
        <TouchableOpacity style={styles.button} onPress={throwSyncError}>
          <Text style={styles.buttonText}>Throw Sync Error</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.button} onPress={throwAsyncError}>
          <Text style={styles.buttonText}>Throw Async Error</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.button}
          onPress={triggerUnhandledRejection}
        >
          <Text style={styles.buttonText}>Unhandled Rejection</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.button, styles.buttonLog]}
          onPress={() => console.error('Test console error')}
        >
          <Text style={styles.buttonText}>Console Error</Text>
        </TouchableOpacity>
      </View>

      {/* Error Boundary Tests Section */}
      <Text style={styles.sectionTitle}>Error Boundary Tests</Text>
      <Text style={styles.sectionDescription}>
        Test Faro's React Error Boundary integration. The boundary catches errors,
        sends them to Faro, and shows a fallback UI.
      </Text>

      <FaroErrorBoundary
        key={boundaryKey}
        fallback={(error, resetError) => (
          <ErrorFallback error={error} resetError={resetError} />
        )}
        onReset={handleReset}
        pushErrorOptions={{
          type: 'Component Error',
          context: {
            screen: 'ErrorDemo',
            component: 'BrokenComponent',
          },
        }}
      >
        <View style={styles.boundaryContainer}>
          <BrokenComponent shouldThrow={shouldThrowError} />
        </View>
      </FaroErrorBoundary>

      {!shouldThrowError && (
        <TouchableOpacity
          style={[styles.button, styles.dangerButton]}
          onPress={handleTriggerError}
        >
          <Text style={styles.buttonText}>💥 Trigger Component Error</Text>
          <Text style={styles.buttonDescription}>
            Throws an error inside the boundary
          </Text>
        </TouchableOpacity>
      )}
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
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    marginTop: 16,
    marginBottom: 12,
    color: '#333',
  },
  sectionDescription: {
    fontSize: 14,
    color: '#666',
    marginBottom: 16,
    lineHeight: 20,
  },
  buttonContainer: {
    gap: 12,
    marginBottom: 16,
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
  dangerButton: {
    backgroundColor: '#ff4d4f',
    marginTop: 12,
  },
  buttonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#fff',
  },
  buttonDescription: {
    fontSize: 14,
    color: 'rgba(255, 255, 255, 0.8)',
    marginTop: 4,
  },
  boundaryContainer: {
    padding: 16,
    backgroundColor: '#f5f5f5',
    borderRadius: 8,
    marginBottom: 16,
    minHeight: 80,
    justifyContent: 'center',
    alignItems: 'center',
  },
  successBox: {
    padding: 16,
  },
  successText: {
    fontSize: 16,
    color: '#52c41a',
    fontWeight: '600',
  },
  errorContainer: {
    padding: 20,
    backgroundColor: '#fff1f0',
    borderRadius: 8,
    borderWidth: 2,
    borderColor: '#ff4d4f',
  },
  errorTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#ff4d4f',
    marginBottom: 8,
  },
  errorMessage: {
    fontSize: 14,
    color: '#666',
    marginBottom: 16,
  },
  resetButton: {
    backgroundColor: '#1890ff',
    padding: 12,
    borderRadius: 6,
    alignItems: 'center',
  },
  resetButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
});
