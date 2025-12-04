import React, { useState } from 'react';
import {
  ActivityIndicator,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';

import { faro } from '@grafana/faro-react-native';

export function PerformanceDemoScreen() {
  const [isLoading, setIsLoading] = useState(false);
  const [result, setResult] = useState<string>('');

  const runHeavyComputation = () => {
    setIsLoading(true);
    setResult('');

    setTimeout(() => {
      const startTime = Date.now();

      // Heavy computation
      let sum = 0;
      for (let i = 0; i < 10000000; i++) {
        sum += Math.sqrt(i);
      }

      const duration = Date.now() - startTime;

      // Report measurement to Faro
      faro.api.pushMeasurement({
        type: 'heavy_computation',
        values: {
          duration,
        },
        context: {
          iterations: '10000000',
          result: sum.toFixed(2),
        },
      });

      setResult(`Computation took ${duration}ms. Result: ${sum.toFixed(2)}`);
      setIsLoading(false);
    }, 100);
  };

  const simulateSlowRender = () => {
    setIsLoading(true);
    setResult('');

    const startTime = Date.now();

    setTimeout(() => {
      const duration = Date.now() - startTime;

      // Report measurement to Faro
      faro.api.pushMeasurement({
        type: 'slow_render',
        values: {
          duration,
        },
        context: {
          simulatedDelay: '2000',
        },
      });

      setResult('Render simulation complete');
      setIsLoading(false);
    }, 2000);
  };

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <Text style={styles.title}>Performance Demo</Text>
      <Text style={styles.description}>
        Test performance monitoring and measurements.
      </Text>

      <View style={styles.buttonContainer}>
        <TouchableOpacity
          style={styles.button}
          onPress={runHeavyComputation}
          disabled={isLoading}
        >
          <Text style={styles.buttonText}>Run Heavy Computation</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.button}
          onPress={simulateSlowRender}
          disabled={isLoading}
        >
          <Text style={styles.buttonText}>Simulate Slow Render</Text>
        </TouchableOpacity>
      </View>

      {isLoading && (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#FF5F00" />
          <Text style={styles.loadingText}>Processing...</Text>
        </View>
      )}

      {result !== '' && (
        <View style={styles.resultContainer}>
          <Text style={styles.resultText}>{result}</Text>
        </View>
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
  buttonContainer: {
    gap: 12,
  },
  button: {
    backgroundColor: '#28a745',
    padding: 16,
    borderRadius: 8,
    alignItems: 'center',
  },
  buttonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#fff',
  },
  loadingContainer: {
    marginTop: 24,
    alignItems: 'center',
    gap: 12,
  },
  loadingText: {
    fontSize: 14,
    color: '#666',
  },
  resultContainer: {
    marginTop: 24,
    padding: 16,
    backgroundColor: '#f8f9fa',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#dee2e6',
  },
  resultText: {
    fontSize: 14,
    color: '#333',
  },
});
