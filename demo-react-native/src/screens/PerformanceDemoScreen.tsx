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
  const [currentTest, setCurrentTest] = useState<string>('');

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

  /**
   * CPU Stress Test - runs for 10 seconds
   * Performs intensive mathematical calculations to spike CPU usage
   * Metrics are collected every 5 seconds, so we should see 2-3 spikes
   */
  const runCPUStressTest = () => {
    setIsLoading(true);
    setResult('');
    setCurrentTest('Running CPU stress test (10 seconds)...');

    const startTime = Date.now();
    const testDuration = 10000; // 10 seconds
    let iterations = 0;

    // Run intensive computation in chunks to avoid blocking UI completely
    const runChunk = () => {
      const chunkStart = Date.now();

      // Run for 100ms chunks
      while (Date.now() - chunkStart < 100) {
        // CPU-intensive operations
        let result = 0;
        for (let i = 0; i < 100000; i++) {
          result += Math.sqrt(i) * Math.sin(i) * Math.cos(i);
          result += Math.pow(i % 100, 2);
          result += Math.log(i + 1);
        }
        iterations++;
      }

      // Check if test should continue
      if (Date.now() - startTime < testDuration) {
        // Schedule next chunk
        setTimeout(runChunk, 10);
      } else {
        // Test complete
        const totalDuration = Date.now() - startTime;

        faro.api.pushMeasurement({
          type: 'cpu_stress_test',
          values: {
            duration: totalDuration,
            iterations,
          },
        });

        setResult(
          `CPU stress test complete!\n` +
          `Duration: ${totalDuration}ms\n` +
          `Iterations: ${iterations}\n` +
          `Check Faro metrics for CPU spikes every 5 seconds`
        );
        setIsLoading(false);
        setCurrentTest('');
      }
    };

    // Start the test
    setTimeout(runChunk, 100);
  };

  /**
   * Memory Stress Test - runs for 10 seconds
   * Allocates large arrays to spike memory usage
   * Metrics are collected every 5 seconds, so we should see 2-3 spikes
   */
  const runMemoryStressTest = () => {
    setIsLoading(true);
    setResult('');
    setCurrentTest('Running memory stress test (10 seconds)...');

    const startTime = Date.now();
    const testDuration = 10000; // 10 seconds
    const memoryHogs: any[] = [];
    let allocationCount = 0;

    // Allocate memory in chunks
    const allocateChunk = () => {
      // Allocate ~10MB per chunk (array of 2.5M numbers = ~10MB)
      const chunk = new Array(2500000);
      for (let i = 0; i < chunk.length; i++) {
        chunk[i] = Math.random() * 1000000;
      }
      memoryHogs.push(chunk);
      allocationCount++;

      // Check if test should continue
      if (Date.now() - startTime < testDuration) {
        // Schedule next allocation
        setTimeout(allocateChunk, 100);
      } else {
        // Test complete
        const totalDuration = Date.now() - startTime;
        const estimatedMemoryMB = allocationCount * 10;

        faro.api.pushMeasurement({
          type: 'memory_stress_test',
          values: {
            duration: totalDuration,
            allocations: allocationCount,
            estimated_mb: estimatedMemoryMB,
          },
        });

        setResult(
          `Memory stress test complete!\n` +
          `Duration: ${totalDuration}ms\n` +
          `Allocated: ~${estimatedMemoryMB}MB\n` +
          `Check Faro metrics for memory spikes every 5 seconds`
        );

        // Clean up memory
        memoryHogs.length = 0;

        setIsLoading(false);
        setCurrentTest('');
      }
    };

    // Start the test
    setTimeout(allocateChunk, 100);
  };

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <Text style={styles.title}>Performance Demo</Text>
      <Text style={styles.description}>
        Test performance monitoring and measurements. CPU/Memory metrics collected every 5 seconds.
      </Text>

      <Text style={styles.sectionTitle}>Stress Tests (10 seconds each)</Text>
      <View style={styles.buttonContainer}>
        <TouchableOpacity
          style={[styles.button, styles.cpuButton]}
          onPress={runCPUStressTest}
          disabled={isLoading}
        >
          <Text style={styles.buttonText}>🔥 CPU Stress Test</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.button, styles.memoryButton]}
          onPress={runMemoryStressTest}
          disabled={isLoading}
        >
          <Text style={styles.buttonText}>💾 Memory Stress Test</Text>
        </TouchableOpacity>
      </View>

      <Text style={styles.sectionTitle}>Other Tests</Text>
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
          {currentTest && <Text style={styles.loadingText}>{currentTest}</Text>}
          {!currentTest && <Text style={styles.loadingText}>Processing...</Text>}
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
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    marginTop: 16,
    marginBottom: 12,
    color: '#333',
  },
  buttonContainer: {
    gap: 12,
    marginBottom: 16,
  },
  button: {
    backgroundColor: '#28a745',
    padding: 16,
    borderRadius: 8,
    alignItems: 'center',
  },
  cpuButton: {
    backgroundColor: '#dc3545',
  },
  memoryButton: {
    backgroundColor: '#007bff',
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
    textAlign: 'center',
    marginTop: 8,
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
    lineHeight: 20,
  },
});
