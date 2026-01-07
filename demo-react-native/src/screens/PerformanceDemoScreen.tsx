import type { NativeStackScreenProps } from '@react-navigation/native-stack';
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

import { PerformanceMetricsCard } from '../components/PerformanceMetricsCard';
import type { RootStackParamList } from '../navigation/AppNavigator';

type Props = NativeStackScreenProps<RootStackParamList, 'PerformanceDemo'>;

export function PerformanceDemoScreen({ navigation }: Props) {
  const [isLoading, setIsLoading] = useState(false);
  const [result, setResult] = useState<string>('');
  const [currentTest, setCurrentTest] = useState<string>('');

  /**
   * CPU Stress Test - runs for 20 seconds
   * Performs intensive mathematical calculations to spike CPU usage
   * Live metrics update every 2 seconds to show the spike in real-time
   */
  const runCPUStressTest = () => {
    setIsLoading(true);
    setResult('');
    setCurrentTest('Running CPU stress test (20 seconds)...');

    const startTime = Date.now();
    const testDuration = 20000; // 20 seconds
    let iterations = 0;

    // Run intensive computation in chunks to avoid blocking UI completely
    const runChunk = () => {
      const chunkStart = Date.now();

      // Run for 100ms chunks
      while (Date.now() - chunkStart < 100) {
        // CPU-intensive operations
        for (let i = 0; i < 100000; i++) {
          // Perform CPU-intensive calculations (results intentionally unused)
          Math.sqrt(i) * Math.sin(i) * Math.cos(i);
          Math.pow(i % 100, 2);
          Math.log(i + 1);
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
            `Watch the live CPU metrics above to see the spike!`,
        );
        setIsLoading(false);
        setCurrentTest('');
      }
    };

    // Start the test
    setTimeout(runChunk, 100);
  };

  /**
   * Memory Stress Test - runs for 20 seconds
   * Allocates arrays to gradually increase memory usage
   * Live metrics update every 2 seconds to show the spike in real-time
   *
   * NOTE: Allocates smaller chunks less frequently to avoid OOM crashes
   */
  const runMemoryStressTest = () => {
    setIsLoading(true);
    setResult('');
    setCurrentTest('Running memory stress test (20 seconds)...');

    const startTime = Date.now();
    const testDuration = 20000; // 20 seconds
    const memoryHogs: any[] = [];
    let allocationCount = 0;

    // Allocate memory in smaller chunks less frequently
    const allocateChunk = () => {
      // Allocate ~5MB per chunk (array of 1.25M numbers = ~5MB)
      // Reduced from 10MB to prevent OOM crashes
      const chunk = new Array(1250000);
      for (let i = 0; i < chunk.length; i++) {
        chunk[i] = Math.random() * 1000000;
      }
      memoryHogs.push(chunk);
      allocationCount++;

      // Check if test should continue
      if (Date.now() - startTime < testDuration) {
        // Schedule next allocation after 500ms (reduced frequency to prevent crashes)
        setTimeout(allocateChunk, 500);
      } else {
        // Test complete
        const totalDuration = Date.now() - startTime;
        const estimatedMemoryMB = allocationCount * 5; // Updated to 5MB per allocation

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
            `Watch the live memory metrics above to see the spike!`,
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
        Test performance monitoring with live metrics updating every 2 seconds.
        Watch CPU and memory spike in real-time during stress tests!
      </Text>

      {/* Live Performance Metrics */}
      <PerformanceMetricsCard
        title="⚡ Live Performance Metrics"
        subtitle="Run stress tests below to see CPU and memory spike in real-time!"
      />

      <Text style={styles.sectionTitle}>Stress Tests (20 seconds each)</Text>
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

      <Text style={styles.sectionTitle}>Other Performance Tests</Text>
      <View style={styles.buttonContainer}>
        <TouchableOpacity
          style={[styles.button, styles.slowLoadButton]}
          onPress={() => navigation.navigate('SlowLoadDemo')}
          disabled={isLoading}
        >
          <Text style={styles.buttonText}>🐌 Slow Load Demo</Text>
          <Text style={styles.buttonSubtext}>
            Navigate to a screen with 2.5s load delay
          </Text>
        </TouchableOpacity>
      </View>

      {isLoading && (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#FF5F00" />
          {currentTest && <Text style={styles.loadingText}>{currentTest}</Text>}
          {!currentTest && (
            <Text style={styles.loadingText}>Processing...</Text>
          )}
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
  slowLoadButton: {
    backgroundColor: '#6f42c1',
  },
  buttonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#fff',
  },
  buttonSubtext: {
    fontSize: 13,
    color: 'rgba(255, 255, 255, 0.8)',
    marginTop: 4,
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
