import React, { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';

import { faro } from '@grafana/faro-react-native';

/**
 * Slow Load Demo Screen
 *
 * This screen deliberately takes 2-3 seconds to fully render,
 * making the performance metrics clearly visible in Grafana Cloud.
 *
 * This demonstrates:
 * - Screen navigation performance tracking
 * - Transition time from previous screen
 * - Mount time for slow-loading screens
 */
export function SlowLoadDemoScreen() {
  const [isLoading, setIsLoading] = useState(true);
  const [loadTime, setLoadTime] = useState<number>(0);

  useEffect(() => {
    const startTime = Date.now();

    // Simulate heavy data loading or processing that takes 2.5 seconds
    const timer = setTimeout(() => {
      const duration = Date.now() - startTime;
      setLoadTime(duration);
      setIsLoading(false);

      // Push a custom event to mark when content finished loading
      faro.api.pushEvent('slow_screen_loaded', {
        screenName: 'SlowLoadDemo',
        loadDuration: duration.toString(),
      });

      console.log(`🐌 Slow screen finished loading after ${duration}ms`);
    }, 2500); // 2.5 second delay

    return () => clearTimeout(timer);
  }, []);

  if (isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#FF5F00" />
        <Text style={styles.loadingTitle}>Loading Heavy Content...</Text>
        <Text style={styles.loadingSubtitle}>
          This screen takes ~2.5 seconds to load
        </Text>
        <Text style={styles.loadingDescription}>
          Check Grafana Cloud to see the performance metrics:
        </Text>
        <View style={styles.metricsBox}>
          <Text style={styles.metricText}>
            • transitionTime: Time from previous screen
          </Text>
          <Text style={styles.metricText}>
            • mountTime: Time for this screen to mount
          </Text>
          <Text style={styles.metricText}>• screenName: "SlowLoadDemo"</Text>
        </View>
      </View>
    );
  }

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <Text style={styles.title}>🐌 Slow Load Complete!</Text>
      <Text style={styles.subtitle}>Content loaded successfully</Text>

      <View style={styles.successBox}>
        <Text style={styles.successText}>✅ Screen Loaded</Text>
        <Text style={styles.timeText}>Load Time: {loadTime}ms</Text>
      </View>

      <View style={styles.infoBox}>
        <Text style={styles.infoTitle}>Performance Metrics Sent:</Text>
        <Text style={styles.infoText}>
          The PerformanceInstrumentation automatically tracked:
        </Text>
        <View style={styles.metricsDetailBox}>
          <Text style={styles.metricDetail}>
            📊 Event: faro.performance.screen
          </Text>
          <Text style={styles.metricDetail}>🏷️ screenName: "SlowLoadDemo"</Text>
          <Text style={styles.metricDetail}>
            ⏱️ transitionTime: Time from previous screen
          </Text>
          <Text style={styles.metricDetail}>
            🚀 mountTime: ~2500ms (slow loading simulation)
          </Text>
        </View>
      </View>

      <View style={styles.tipBox}>
        <Text style={styles.tipTitle}>💡 View in Grafana Cloud</Text>
        <Text style={styles.tipText}>Query in Explore:</Text>
        <View style={styles.codeBox}>
          <Text style={styles.codeText}>
            {'{'}kind="event", event_name="faro.performance.screen"{'}'}
          </Text>
        </View>
        <Text style={styles.tipText}>Filter by:</Text>
        <View style={styles.codeBox}>
          <Text style={styles.codeText}>
            | event_attributes_screenName = "SlowLoadDemo"
          </Text>
        </View>
      </View>

      <View style={styles.noteBox}>
        <Text style={styles.noteText}>
          🎯 Navigate back and forth between this screen and others to see
          multiple performance measurements with different transition and mount
          times!
        </Text>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
    backgroundColor: '#fff',
  },
  loadingTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    marginTop: 20,
    color: '#333',
  },
  loadingSubtitle: {
    fontSize: 16,
    marginTop: 8,
    color: '#666',
    textAlign: 'center',
  },
  loadingDescription: {
    fontSize: 14,
    marginTop: 24,
    marginBottom: 12,
    color: '#666',
    textAlign: 'center',
  },
  metricsBox: {
    backgroundColor: '#f8f9fa',
    padding: 16,
    borderRadius: 8,
    marginTop: 8,
    borderWidth: 1,
    borderColor: '#dee2e6',
    alignSelf: 'stretch',
    marginHorizontal: 20,
  },
  metricText: {
    fontSize: 12,
    color: '#495057',
    fontFamily: 'monospace',
    marginVertical: 2,
  },
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
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 16,
    marginBottom: 24,
    color: '#666',
    textAlign: 'center',
  },
  successBox: {
    backgroundColor: '#d4edda',
    padding: 20,
    borderRadius: 8,
    marginBottom: 20,
    borderLeftWidth: 4,
    borderLeftColor: '#28a745',
    alignItems: 'center',
  },
  successText: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#155724',
    marginBottom: 8,
  },
  timeText: {
    fontSize: 18,
    color: '#155724',
    fontFamily: 'monospace',
  },
  infoBox: {
    backgroundColor: '#e7f3ff',
    padding: 16,
    borderRadius: 8,
    marginBottom: 20,
    borderLeftWidth: 4,
    borderLeftColor: '#0066cc',
  },
  infoTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#004085',
    marginBottom: 8,
  },
  infoText: {
    fontSize: 14,
    color: '#004085',
    marginBottom: 12,
  },
  metricsDetailBox: {
    backgroundColor: '#fff',
    padding: 12,
    borderRadius: 4,
    gap: 6,
  },
  metricDetail: {
    fontSize: 13,
    color: '#333',
    fontFamily: 'monospace',
  },
  tipBox: {
    backgroundColor: '#fff3cd',
    padding: 16,
    borderRadius: 8,
    marginBottom: 20,
    borderLeftWidth: 4,
    borderLeftColor: '#ffc107',
  },
  tipTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#856404',
    marginBottom: 8,
  },
  tipText: {
    fontSize: 14,
    color: '#856404',
    marginBottom: 8,
    marginTop: 12,
  },
  codeBox: {
    backgroundColor: '#2d2d2d',
    padding: 12,
    borderRadius: 4,
    marginBottom: 4,
  },
  codeText: {
    fontSize: 12,
    color: '#f8f8f2',
    fontFamily: 'monospace',
  },
  noteBox: {
    backgroundColor: '#f8f9fa',
    padding: 16,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#dee2e6',
  },
  noteText: {
    fontSize: 14,
    color: '#495057',
    lineHeight: 20,
  },
});
