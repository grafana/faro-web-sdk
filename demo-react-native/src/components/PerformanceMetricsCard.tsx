import React, { useEffect, useState } from 'react';
import { NativeModules, StyleSheet, Text, View } from 'react-native';

const { FaroReactNativeModule } = NativeModules;

interface PerformanceMetricsCardProps {
  /** Optional title for the metrics section */
  title?: string;
  /** Optional subtitle/description */
  subtitle?: string;
  /** Update interval in milliseconds (default: 2000ms) */
  updateInterval?: number;
}

/**
 * Shared component for displaying live CPU and memory metrics
 * Updates automatically at the specified interval
 */
export function PerformanceMetricsCard({
  title = '⚡ Live Performance Metrics',
  subtitle = 'Updates every 2 seconds',
  updateInterval = 2000,
}: PerformanceMetricsCardProps) {
  const [cpuUsage, setCpuUsage] = useState<number | null>(null);
  const [memoryUsage, setMemoryUsage] = useState<number | null>(null);

  const updatePerformanceMetrics = () => {
    if (FaroReactNativeModule) {
      try {
        const cpu = FaroReactNativeModule.getCpuUsage();
        const memory = FaroReactNativeModule.getMemoryUsage();
        setCpuUsage(cpu);
        setMemoryUsage(memory);
      } catch (err) {
        console.error('Failed to get performance metrics', err);
      }
    }
  };

  useEffect(() => {
    updatePerformanceMetrics();

    // Update performance metrics at specified interval
    const interval = setInterval(updatePerformanceMetrics, updateInterval);

    return () => clearInterval(interval);
  }, [updateInterval]);

  return (
    <View style={styles.container}>
      {title && <Text style={styles.title}>{title}</Text>}
      <View style={styles.performanceGrid}>
        <View style={styles.performanceCard}>
          <Text style={styles.performanceLabel}>CPU Usage</Text>
          <Text style={styles.performanceValue}>
            {cpuUsage !== null && cpuUsage > 0
              ? `${cpuUsage.toFixed(1)}%`
              : 'Calculating...'}
          </Text>
        </View>
        <View style={styles.performanceCard}>
          <Text style={styles.performanceLabel}>Memory Usage</Text>
          <Text style={styles.performanceValue}>
            {memoryUsage !== null && memoryUsage > 0
              ? `${(memoryUsage / 1024).toFixed(1)} MB`
              : 'Calculating...'}
          </Text>
        </View>
      </View>
      {subtitle && <Text style={styles.subtitle}>{subtitle}</Text>}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginBottom: 20,
    backgroundColor: '#fff',
    padding: 15,
    borderRadius: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  title: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 15,
    color: '#333',
  },
  performanceGrid: {
    flexDirection: 'row',
    gap: 12,
  },
  performanceCard: {
    flex: 1,
    backgroundColor: '#f0f9ff',
    padding: 16,
    borderRadius: 8,
    borderWidth: 2,
    borderColor: '#3b82f6',
    alignItems: 'center',
  },
  performanceLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: '#1e40af',
    marginBottom: 8,
    textTransform: 'uppercase',
  },
  performanceValue: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#3b82f6',
  },
  subtitle: {
    fontSize: 12,
    color: '#666',
    marginTop: 12,
    textAlign: 'center',
  },
});
