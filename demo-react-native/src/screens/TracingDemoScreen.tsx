import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, Button, Alert, ActivityIndicator } from 'react-native';
import { faro } from '@grafana/faro-react-native';

/**
 * Tracing Demo Screen
 *
 * Demonstrates distributed tracing capabilities:
 * - HTTP request tracing with fetch instrumentation
 * - Manual span creation with context propagation
 * - Trace ID display for querying in Grafana Cloud
 * - Error tracing
 * - Nested spans
 */
export default function TracingDemoScreen() {
  const [traceIds, setTraceIds] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);

  // Helper to capture and display trace ID
  const captureTraceId = () => {
    // Get current trace context from OpenTelemetry
    const otel = (faro as any).otel;
    if (otel) {
      const { trace } = otel;
      const span = trace.getActiveSpan();
      if (span) {
        const traceId = span.spanContext().traceId;
        setTraceIds(prev => [...prev, traceId]);
        return traceId;
      }
    }
    return null;
  };

  // Test 1: Simple HTTP Request Trace
  const testSimpleFetch = async () => {
    setLoading(true);
    try {
      // This will be automatically traced by FetchInstrumentation
      const response = await fetch('https://jsonplaceholder.typicode.com/posts/1');
      const data = await response.json();

      const traceId = captureTraceId();

      Alert.alert(
        'Success',
        `Fetched post: "${data.title}"\n\n${traceId ? `Trace ID: ${traceId}` : 'Check console for trace'}`,
      );
    } catch (error) {
      Alert.alert('Error', `Fetch failed: ${error}`);
    } finally {
      setLoading(false);
    }
  };

  // Test 2: Multiple Sequential Requests
  const testSequentialRequests = async () => {
    setLoading(true);
    try {
      // These will be traced as separate spans but with correlation
      const [post1, post2, post3] = await Promise.all([
        fetch('https://jsonplaceholder.typicode.com/posts/1').then(r => r.json()),
        fetch('https://jsonplaceholder.typicode.com/posts/2').then(r => r.json()),
        fetch('https://jsonplaceholder.typicode.com/posts/3').then(r => r.json()),
      ]);

      const traceId = captureTraceId();

      Alert.alert(
        'Success',
        `Fetched 3 posts in parallel\n\n${traceId ? `Trace ID: ${traceId}` : 'Check console for traces'}`,
      );
    } catch (error) {
      Alert.alert('Error', `Sequential requests failed: ${error}`);
    } finally {
      setLoading(false);
    }
  };

  // Test 3: Error Trace
  const testErrorTrace = async () => {
    setLoading(true);
    try {
      // This will fail and be traced as an error span
      await fetch('https://jsonplaceholder.typicode.com/invalid-endpoint-404');

      const traceId = captureTraceId();

      Alert.alert(
        'Error Traced',
        `404 error was traced\n\n${traceId ? `Trace ID: ${traceId}` : 'Check console for error trace'}`,
      );
    } catch (error) {
      const traceId = captureTraceId();
      Alert.alert(
        'Error Traced',
        `Network error was traced: ${error}\n\n${traceId ? `Trace ID: ${traceId}` : ''}`,
      );
    } finally {
      setLoading(false);
    }
  };

  // Test 4: Slow Request Trace
  const testSlowRequest = async () => {
    setLoading(true);
    try {
      // Use a delay service to simulate slow request
      const startTime = Date.now();
      await fetch('https://httpbin.org/delay/2');
      const duration = Date.now() - startTime;

      const traceId = captureTraceId();

      Alert.alert(
        'Success',
        `Slow request completed in ${duration}ms\n\n${traceId ? `Trace ID: ${traceId}` : 'Check console for trace'}`,
      );
    } catch (error) {
      Alert.alert('Error', `Slow request failed: ${error}`);
    } finally {
      setLoading(false);
    }
  };

  // Test 5: Manual Span with Custom Attributes
  const testManualSpan = async () => {
    const otel = (faro as any).otel;
    if (!otel) {
      Alert.alert('Error', 'OTEL not available. Make sure tracing is initialized.');
      return;
    }

    setLoading(true);
    const { trace } = otel;
    const tracer = trace.getTracer('demo-app');

    const span = tracer.startSpan('custom-operation', {
      attributes: {
        'operation.type': 'manual',
        'operation.name': 'test-custom-span',
        'user.action': 'button-click',
      },
    });

    try {
      // Simulate some work
      await new Promise(resolve => setTimeout(resolve, 1000));

      span.setAttribute('operation.duration', '1000ms');
      span.setStatus({ code: 1 }); // OK status

      const traceId = span.spanContext().traceId;
      setTraceIds(prev => [...prev, traceId]);

      Alert.alert(
        'Success',
        `Manual span created\n\nTrace ID: ${traceId}`,
      );
    } catch (error) {
      span.setStatus({ code: 2, message: String(error) }); // ERROR status
      Alert.alert('Error', `Manual span failed: ${error}`);
    } finally {
      span.end();
      setLoading(false);
    }
  };

  // Test 6: Clear Trace IDs
  const clearTraceIds = () => {
    setTraceIds([]);
    Alert.alert('Cleared', 'All trace IDs have been cleared');
  };

  return (
    <ScrollView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Distributed Tracing Demo</Text>
        <Text style={styles.subtitle}>
          Test OpenTelemetry tracing integration with automatic fetch instrumentation
        </Text>
      </View>

      {loading && (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#0066cc" />
          <Text style={styles.loadingText}>Creating trace...</Text>
        </View>
      )}

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Automatic HTTP Tracing</Text>
        <Text style={styles.description}>
          These tests automatically create traces for HTTP requests using FetchInstrumentation
        </Text>

        <Button
          title="1. Simple Fetch Request"
          onPress={testSimpleFetch}
          disabled={loading}
        />
        <View style={styles.spacer} />

        <Button
          title="2. Parallel Requests"
          onPress={testSequentialRequests}
          disabled={loading}
        />
        <View style={styles.spacer} />

        <Button
          title="3. Error Trace (404)"
          onPress={testErrorTrace}
          disabled={loading}
        />
        <View style={styles.spacer} />

        <Button
          title="4. Slow Request (2s delay)"
          onPress={testSlowRequest}
          disabled={loading}
        />
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Manual Tracing</Text>
        <Text style={styles.description}>
          Create custom spans with attributes using the OpenTelemetry API
        </Text>

        <Button
          title="5. Create Manual Span"
          onPress={testManualSpan}
          disabled={loading}
        />
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Trace IDs</Text>
        <Text style={styles.description}>
          Use these trace IDs to query traces in Grafana Cloud Tempo
        </Text>

        {traceIds.length === 0 ? (
          <Text style={styles.noTraces}>No traces captured yet. Run a test above.</Text>
        ) : (
          <>
            {traceIds.map((traceId, index) => (
              <View key={index} style={styles.traceIdContainer}>
                <Text style={styles.traceIdLabel}>Trace #{index + 1}:</Text>
                <Text style={styles.traceId} selectable>
                  {traceId}
                </Text>
              </View>
            ))}
            <View style={styles.spacer} />
            <Button
              title="Clear Trace IDs"
              onPress={clearTraceIds}
              color="#dc3545"
            />
          </>
        )}
      </View>

      <View style={styles.footer}>
        <Text style={styles.footerText}>
          💡 Tip: Copy trace IDs and search for them in Grafana Cloud → Explore → Tempo
        </Text>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  header: {
    padding: 20,
    backgroundColor: '#f8f9fa',
    borderBottomWidth: 1,
    borderBottomColor: '#dee2e6',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#212529',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 14,
    color: '#6c757d',
    lineHeight: 20,
  },
  loadingContainer: {
    padding: 20,
    alignItems: 'center',
    backgroundColor: '#e7f3ff',
    borderBottomWidth: 1,
    borderBottomColor: '#cce5ff',
  },
  loadingText: {
    marginTop: 10,
    fontSize: 14,
    color: '#004085',
  },
  section: {
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#dee2e6',
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#212529',
    marginBottom: 8,
  },
  description: {
    fontSize: 14,
    color: '#6c757d',
    marginBottom: 16,
    lineHeight: 20,
  },
  spacer: {
    height: 12,
  },
  noTraces: {
    fontSize: 14,
    color: '#6c757d',
    fontStyle: 'italic',
    padding: 12,
    textAlign: 'center',
  },
  traceIdContainer: {
    backgroundColor: '#f8f9fa',
    padding: 12,
    borderRadius: 6,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#dee2e6',
  },
  traceIdLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: '#495057',
    marginBottom: 4,
  },
  traceId: {
    fontSize: 12,
    fontFamily: 'monospace',
    color: '#0066cc',
    lineHeight: 18,
  },
  footer: {
    padding: 20,
    backgroundColor: '#fff3cd',
    borderTopWidth: 1,
    borderTopColor: '#ffc107',
  },
  footerText: {
    fontSize: 13,
    color: '#856404',
    lineHeight: 20,
  },
});
