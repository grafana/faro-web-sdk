import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import React, { useState } from 'react';
import {
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';

import { FaroErrorBoundary } from '@grafana/faro-react-native';

import type { RootStackParamList } from '../navigation/AppNavigator';

type Props = NativeStackScreenProps<RootStackParamList, 'ErrorBoundaryDemo'>;

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

export function ErrorBoundaryDemoScreen({ navigation }: Props) {
  const [shouldThrowError, setShouldThrowError] = useState(false);
  const [boundaryKey, setBoundaryKey] = useState(0);

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
      <Text style={styles.title}>Error Boundary Demo</Text>
      <Text style={styles.subtitle}>
        Test Faro's React Error Boundary integration
      </Text>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Component Error Boundary</Text>
        <Text style={styles.sectionDescription}>
          Wraps a component that can throw errors. The boundary catches the
          error, sends it to Faro, and shows a fallback UI.
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
              screen: 'ErrorBoundaryDemo',
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
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>How It Works</Text>
        <View style={styles.step}>
          <Text style={styles.stepNumber}>1</Text>
          <Text style={styles.stepText}>
            Component throws an error during render
          </Text>
        </View>
        <View style={styles.step}>
          <Text style={styles.stepNumber}>2</Text>
          <Text style={styles.stepText}>
            Error Boundary catches it with componentDidCatch
          </Text>
        </View>
        <View style={styles.step}>
          <Text style={styles.stepNumber}>3</Text>
          <Text style={styles.stepText}>
            Error is sent to Grafana Cloud with component stack
          </Text>
        </View>
        <View style={styles.step}>
          <Text style={styles.stepNumber}>4</Text>
          <Text style={styles.stepText}>
            Fallback UI is shown with reset option
          </Text>
        </View>
      </View>

      <TouchableOpacity
        style={styles.backButton}
        onPress={() => navigation.goBack()}
      >
        <Text style={styles.buttonText}>← Back to Home</Text>
      </TouchableOpacity>
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
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 8,
    color: '#333',
  },
  sectionDescription: {
    fontSize: 14,
    color: '#666',
    marginBottom: 16,
    lineHeight: 20,
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
  dangerButton: {
    backgroundColor: '#ff4d4f',
  },
  backButton: {
    backgroundColor: '#8c8c8c',
    padding: 20,
    borderRadius: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
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
  step: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  stepNumber: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#1890ff',
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
    textAlign: 'center',
    lineHeight: 32,
    marginRight: 12,
  },
  stepText: {
    flex: 1,
    fontSize: 14,
    color: '#333',
  },
});
