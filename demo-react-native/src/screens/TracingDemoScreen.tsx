import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Alert, ActivityIndicator } from 'react-native';
import { SpanStatusCode } from '@opentelemetry/api';
import { faro, trackUserAction } from '@grafana/faro-react-native';
import { UserActionImportance, UserActionInternalInterface } from '@grafana/faro-core';

/**
 * Comprehensive Tracing Demo Screen
 *
 * Demonstrates all aspects of OpenTelemetry distributed tracing:
 * - Automatic HTTP request tracing (fetch instrumentation)
 * - Manual span creation with custom attributes
 * - Context propagation and nested spans
 * - Error tracing with proper status codes
 * - Integration with Faro user actions
 * - Trace ID capture for querying in Grafana Cloud
 */
export default function TracingDemoScreen() {
  const [traceIds, setTraceIds] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [lastTestName, setLastTestName] = useState<string>('');

  // Helper to capture and display trace ID from active span
  const captureTraceId = (testName: string) => {
    const otel = (faro as any).otel;
    if (otel) {
      const { trace } = otel;
      const span = trace.getActiveSpan();
      if (span) {
        const traceId = span.spanContext().traceId;
        setTraceIds(prev => [...prev, traceId]);
        setLastTestName(testName);
        return traceId;
      }
    }
    return null;
  };

  // ============================================================================
  // AUTOMATIC HTTP TRACING
  // ============================================================================

  // Test 1: Simple fetch request with automatic tracing
  const testSimpleFetch = async () => {
    setLoading(true);
    try {
      // FetchInstrumentation automatically creates a span for this request
      const response = await fetch('https://jsonplaceholder.typicode.com/posts/1');
      const data = await response.json();

      // Capture the trace ID from the automatically created span
      const traceId = captureTraceId('Simple Fetch');

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

  // Test 2: Parallel requests - shows multiple spans under a parent
  const testParallelRequests = async () => {
    setLoading(true);
    try {
      // All three requests will be traced as separate spans
      // They share the same trace context, showing parallel execution
      const [post1, post2, post3] = await Promise.all([
        fetch('https://jsonplaceholder.typicode.com/posts/1').then(r => r.json()),
        fetch('https://jsonplaceholder.typicode.com/posts/2').then(r => r.json()),
        fetch('https://jsonplaceholder.typicode.com/posts/3').then(r => r.json()),
      ]);

      const traceId = captureTraceId('Parallel Requests');

      Alert.alert(
        'Success',
        `Fetched 3 posts in parallel\n\nTitles:\n1. ${post1.title}\n2. ${post2.title}\n3. ${post3.title}\n\n${traceId ? `Trace ID: ${traceId}` : ''}`,
      );
    } catch (error) {
      Alert.alert('Error', `Parallel requests failed: ${error}`);
    } finally {
      setLoading(false);
    }
  };

  // Test 3: Sequential requests - shows waterfall pattern
  const testSequentialRequests = async () => {
    setLoading(true);
    try {
      // Sequential requests show dependency chain in trace waterfall
      const post1 = await fetch('https://jsonplaceholder.typicode.com/posts/1').then(r => r.json());
      const post2 = await fetch('https://jsonplaceholder.typicode.com/posts/2').then(r => r.json());
      const post3 = await fetch('https://jsonplaceholder.typicode.com/posts/3').then(r => r.json());

      const traceId = captureTraceId('Sequential Requests');

      Alert.alert(
        'Success',
        `Fetched 3 posts sequentially\n\nThis creates a waterfall pattern in traces\n\n${traceId ? `Trace ID: ${traceId}` : ''}`,
      );
    } catch (error) {
      Alert.alert('Error', `Sequential requests failed: ${error}`);
    } finally {
      setLoading(false);
    }
  };

  // Test 4: Slow request - demonstrates duration tracking
  const testSlowRequest = async () => {
    setLoading(true);
    try {
      const startTime = Date.now();
      // This endpoint delays response by 2 seconds
      await fetch('https://httpbin.org/delay/2');
      const duration = Date.now() - startTime;

      const traceId = captureTraceId('Slow Request');

      Alert.alert(
        'Success',
        `Slow request completed in ${duration}ms\n\nYou can see the duration in the trace span\n\n${traceId ? `Trace ID: ${traceId}` : ''}`,
      );
    } catch (error) {
      Alert.alert('Error', `Slow request failed: ${error}`);
    } finally {
      setLoading(false);
    }
  };

  // Test 5: Error tracing - 404 status code
  const testErrorTrace = async () => {
    setLoading(true);
    try {
      const response = await fetch('https://jsonplaceholder.typicode.com/invalid-endpoint-404');

      if (!response.ok) {
        const traceId = captureTraceId('Error Trace - 404');
        Alert.alert(
          'Error Traced',
          `404 error was automatically traced\n\nStatus: ${response.status}\n\n${traceId ? `Trace ID: ${traceId}` : ''}`,
        );
      }
    } catch (error) {
      const traceId = captureTraceId('Error Trace - Network');
      Alert.alert(
        'Error Traced',
        `Network error was traced: ${error}\n\n${traceId ? `Trace ID: ${traceId}` : ''}`,
      );
    } finally {
      setLoading(false);
    }
  };

  // ============================================================================
  // MANUAL SPAN CREATION
  // ============================================================================

  // Test 6: Simple manual span
  const testManualSpan = async () => {
    const otel = (faro as any).otel;
    if (!otel) {
      Alert.alert('Error', 'OTEL not available. Make sure tracing is initialized.');
      return;
    }

    setLoading(true);
    const { trace } = otel;
    const tracer = trace.getTracer('demo-app');

    // Create a manual span with custom attributes
    const span = tracer.startSpan('custom-operation', {
      attributes: {
        'operation.type': 'manual',
        'operation.name': 'test-custom-span',
        'user.action': 'button-click',
        'demo.version': '1.0.0',
      },
    });

    try {
      // Simulate some work
      await // @ts-expect-error - React Native 19 setTimeout types
      new Promise(resolve => setTimeout(resolve, 1000));

      // Add more attributes during execution
      span.setAttribute('operation.duration', '1000ms');
      span.setAttribute('operation.result', 'success');

      // Mark span as successful
      span.setStatus({ code: SpanStatusCode.OK });

      const traceId = span.spanContext().traceId;
      setTraceIds(prev => [...prev, traceId]);
      setLastTestName('Manual Span');

      Alert.alert(
        'Success',
        `Manual span created with custom attributes\n\nTrace ID: ${traceId}`,
      );
    } catch (error) {
      // Mark span as failed
      span.setStatus({
        code: SpanStatusCode.ERROR,
        message: String(error)
      });
      Alert.alert('Error', `Manual span failed: ${error}`);
    } finally {
      // Always end the span
      span.end();
      setLoading(false);
    }
  };

  // Test 7: Nested spans - parent/child relationship
  const testNestedSpans = async () => {
    const otel = (faro as any).otel;
    if (!otel) {
      Alert.alert('Error', 'OTEL not available.');
      return;
    }

    setLoading(true);
    const { trace, context } = otel;
    const tracer = trace.getTracer('demo-app');

    // Create parent span
    const parentSpan = tracer.startSpan('parent-operation', {
      attributes: {
        'operation.level': 'parent',
      },
    });

    try {
      // Set parent span as active context
      await context.with(trace.setSpan(context.active(), parentSpan), async () => {
        // Simulate parent work
        await // @ts-expect-error - React Native 19 setTimeout types
      new Promise(resolve => setTimeout(resolve, 500));
        parentSpan.setAttribute('parent.work', 'completed');

        // Create child span 1
        const childSpan1 = tracer.startSpan('child-operation-1', {
          attributes: {
            'operation.level': 'child',
            'child.index': 1,
          },
        });

        await // @ts-expect-error - React Native 19 setTimeout types
      new Promise(resolve => setTimeout(resolve, 300));
        childSpan1.setStatus({ code: SpanStatusCode.OK });
        childSpan1.end();

        // Create child span 2
        const childSpan2 = tracer.startSpan('child-operation-2', {
          attributes: {
            'operation.level': 'child',
            'child.index': 2,
          },
        });

        await // @ts-expect-error - React Native 19 setTimeout types
      new Promise(resolve => setTimeout(resolve, 400));
        childSpan2.setStatus({ code: SpanStatusCode.OK });
        childSpan2.end();
      });

      parentSpan.setStatus({ code: SpanStatusCode.OK });

      const traceId = parentSpan.spanContext().traceId;
      setTraceIds(prev => [...prev, traceId]);
      setLastTestName('Nested Spans');

      Alert.alert(
        'Success',
        `Created nested spans (1 parent + 2 children)\n\nCheck Grafana to see the parent-child relationship\n\nTrace ID: ${traceId}`,
      );
    } catch (error) {
      parentSpan.setStatus({ code: SpanStatusCode.ERROR, message: String(error) });
      Alert.alert('Error', `Nested spans failed: ${error}`);
    } finally {
      parentSpan.end();
      setLoading(false);
    }
  };

  // Test 8: Span with events - adding timestamped events to a span
  const testSpanWithEvents = async () => {
    const otel = (faro as any).otel;
    if (!otel) {
      Alert.alert('Error', 'OTEL not available.');
      return;
    }

    setLoading(true);
    const { trace } = otel;
    const tracer = trace.getTracer('demo-app');

    const span = tracer.startSpan('operation-with-events');

    try {
      // Add events to mark important points in the span
      span.addEvent('operation.started', {
        'start.timestamp': Date.now(),
      });

      await // @ts-expect-error - React Native 19 setTimeout types
      new Promise(resolve => setTimeout(resolve, 500));

      span.addEvent('operation.checkpoint', {
        'checkpoint.name': 'halfway',
        'progress': '50%',
      });

      await // @ts-expect-error - React Native 19 setTimeout types
      new Promise(resolve => setTimeout(resolve, 500));

      span.addEvent('operation.completed', {
        'end.timestamp': Date.now(),
        'result': 'success',
      });

      span.setStatus({ code: SpanStatusCode.OK });

      const traceId = span.spanContext().traceId;
      setTraceIds(prev => [...prev, traceId]);
      setLastTestName('Span with Events');

      Alert.alert(
        'Success',
        `Span created with 3 timestamped events\n\nEvents mark important checkpoints in the operation\n\nTrace ID: ${traceId}`,
      );
    } catch (error) {
      span.addEvent('operation.error', {
        'error.message': String(error),
      });
      span.setStatus({ code: SpanStatusCode.ERROR, message: String(error) });
      Alert.alert('Error', `Span with events failed: ${error}`);
    } finally {
      span.end();
      setLoading(false);
    }
  };

  // ============================================================================
  // INTEGRATION WITH FARO USER ACTIONS
  // ============================================================================

  // Test 9: Trace with Faro user action
  const testTraceWithUserAction = async () => {
    const otel = (faro as any).otel;
    if (!otel) {
      Alert.alert('Error', 'OTEL not available.');
      return;
    }

    setLoading(true);

    // Start a critical user action
    faro.api.startUserAction(
      'fetch-with-user-action',
      {},
      {
        importance: UserActionImportance.Critical,
      }
    );

    try {
      // The fetch span will automatically include the user action context
      const response = await fetch('https://jsonplaceholder.typicode.com/posts/1');
      const data = await response.json();

      const traceId = captureTraceId('Trace with User Action');

      Alert.alert(
        'Success',
        `Trace includes user action context\n\nUser Action: fetch-with-user-action\nImportance: Critical\n\n${traceId ? `Trace ID: ${traceId}` : ''}`,
      );
    } catch (error) {
      Alert.alert('Error', `Failed: ${error}`);
    } finally {
      setLoading(false);
    }
  };

  // Test 10: Manual span with Faro log
  const testTraceWithLog = () => {
    const otel = (faro as any).otel;
    if (!otel) {
      Alert.alert('Error', 'OTEL not available.');
      return;
    }

    const { trace, context } = otel;
    const span = trace.getTracer('default').startSpan('trace-with-log', {
      attributes: {
        'test.type': 'log-integration',
      },
    });

    // Execute within the span context
    context.with(trace.setSpan(context.active(), span), () => {
      // Push a log that will be correlated with this trace
      faro.api.pushLog(['Trace with log button clicked'], {
        context: { component: 'tracing-demo' },
      });

      span.setStatus({ code: SpanStatusCode.OK });

      const traceId = span.spanContext().traceId;
      setTraceIds(prev => [...prev, traceId]);
      setLastTestName('Trace with Log');

      Alert.alert(
        'Success',
        `Log correlated with trace\n\nThe log entry includes the trace context for correlation in Grafana\n\nTrace ID: ${traceId}`,
      );

      span.end();
    });
  };

  // ============================================================================
  // UTILITIES
  // ============================================================================

  const clearTraceIds = () => {
    setTraceIds([]);
    setLastTestName('');
    Alert.alert('Cleared', 'All trace IDs have been cleared');
  };

  return (
    <ScrollView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>OpenTelemetry Tracing Demo</Text>
        <Text style={styles.subtitle}>
          Comprehensive examples of distributed tracing with automatic and manual instrumentation
        </Text>
      </View>

      {loading && (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#14b8a6" />
          <Text style={styles.loadingText}>Creating trace...</Text>
        </View>
      )}

      {/* Automatic HTTP Tracing */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>📡 Automatic HTTP Tracing</Text>
        <Text style={styles.description}>
          FetchInstrumentation automatically creates spans for all fetch() requests
        </Text>

        <TouchableOpacity
          style={[styles.button, styles.primaryButton]}
          onPress={testSimpleFetch}
          disabled={loading}
        >
          <Text style={styles.buttonText}>1. Simple Fetch Request</Text>
          <Text style={styles.buttonSubtext}>Basic HTTP request tracing</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.button, styles.primaryButton]}
          onPress={testParallelRequests}
          disabled={loading}
        >
          <Text style={styles.buttonText}>2. Parallel Requests</Text>
          <Text style={styles.buttonSubtext}>3 concurrent requests, shows parallel execution</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.button, styles.primaryButton]}
          onPress={testSequentialRequests}
          disabled={loading}
        >
          <Text style={styles.buttonText}>3. Sequential Requests</Text>
          <Text style={styles.buttonSubtext}>Waterfall pattern with dependencies</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.button, styles.primaryButton]}
          onPress={testSlowRequest}
          disabled={loading}
        >
          <Text style={styles.buttonText}>4. Slow Request (2s delay)</Text>
          <Text style={styles.buttonSubtext}>Demonstrates duration tracking</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.button, styles.errorButton]}
          onPress={testErrorTrace}
          disabled={loading}
        >
          <Text style={styles.buttonText}>5. Error Trace (404)</Text>
          <Text style={styles.buttonSubtext}>Automatic error status tracking</Text>
        </TouchableOpacity>
      </View>

      {/* Manual Span Creation */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>🔧 Manual Span Creation</Text>
        <Text style={styles.description}>
          Create custom spans with attributes, events, and nested relationships
        </Text>

        <TouchableOpacity
          style={[styles.button, styles.secondaryButton]}
          onPress={testManualSpan}
          disabled={loading}
        >
          <Text style={styles.buttonText}>6. Simple Manual Span</Text>
          <Text style={styles.buttonSubtext}>Custom span with attributes</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.button, styles.secondaryButton]}
          onPress={testNestedSpans}
          disabled={loading}
        >
          <Text style={styles.buttonText}>7. Nested Spans</Text>
          <Text style={styles.buttonSubtext}>Parent-child span relationships</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.button, styles.secondaryButton]}
          onPress={testSpanWithEvents}
          disabled={loading}
        >
          <Text style={styles.buttonText}>8. Span with Events</Text>
          <Text style={styles.buttonSubtext}>Timestamped checkpoints in a span</Text>
        </TouchableOpacity>
      </View>

      {/* Faro Integration */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>🎯 Faro Integration</Text>
        <Text style={styles.description}>
          Traces correlated with Faro user actions and logs
        </Text>

        <TouchableOpacity
          style={[styles.button, styles.tertiaryButton]}
          onPress={testTraceWithUserAction}
          disabled={loading}
        >
          <Text style={styles.buttonText}>9. Trace with User Action</Text>
          <Text style={styles.buttonSubtext}>Automatic user action context</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.button, styles.tertiaryButton]}
          onPress={testTraceWithLog}
          disabled={loading}
        >
          <Text style={styles.buttonText}>10. Trace with Log</Text>
          <Text style={styles.buttonSubtext}>Log correlated with trace context</Text>
        </TouchableOpacity>
      </View>

      {/* Trace IDs Display */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>🔍 Captured Trace IDs</Text>
        <Text style={styles.description}>
          Use these trace IDs to query traces in Grafana Cloud → Explore → Tempo
        </Text>

        {traceIds.length === 0 ? (
          <Text style={styles.noTraces}>No traces captured yet. Run a test above.</Text>
        ) : (
          <>
            {lastTestName && (
              <View style={styles.lastTestContainer}>
                <Text style={styles.lastTestLabel}>Latest Test:</Text>
                <Text style={styles.lastTestName}>{lastTestName}</Text>
              </View>
            )}
            {traceIds.slice().reverse().map((traceId, index) => (
              <View key={index} style={styles.traceIdContainer}>
                <Text style={styles.traceIdLabel}>Trace #{traceIds.length - index}:</Text>
                <Text style={styles.traceId} selectable>
                  {traceId}
                </Text>
              </View>
            ))}
            <TouchableOpacity
              style={[styles.button, styles.clearButton]}
              onPress={clearTraceIds}
            >
              <Text style={styles.buttonText}>Clear Trace IDs</Text>
            </TouchableOpacity>
          </>
        )}
      </View>

      <View style={styles.footer}>
        <Text style={styles.footerText}>
          💡 Tip: After running tests, go to Grafana Cloud → Explore → Tempo and search by trace ID
        </Text>
        <Text style={styles.footerText}>
          📚 Learn more about OpenTelemetry at opentelemetry.io
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
  button: {
    padding: 16,
    borderRadius: 8,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  primaryButton: {
    backgroundColor: '#14b8a6',
  },
  secondaryButton: {
    backgroundColor: '#8b5cf6',
  },
  tertiaryButton: {
    backgroundColor: '#3b82f6',
  },
  errorButton: {
    backgroundColor: '#ef4444',
  },
  clearButton: {
    backgroundColor: '#dc3545',
    marginTop: 8,
  },
  buttonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#fff',
    marginBottom: 4,
  },
  buttonSubtext: {
    fontSize: 13,
    color: 'rgba(255, 255, 255, 0.8)',
  },
  noTraces: {
    fontSize: 14,
    color: '#6c757d',
    fontStyle: 'italic',
    padding: 12,
    textAlign: 'center',
  },
  lastTestContainer: {
    backgroundColor: '#e7f3ff',
    padding: 12,
    borderRadius: 6,
    marginBottom: 16,
    borderLeftWidth: 4,
    borderLeftColor: '#14b8a6',
  },
  lastTestLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: '#495057',
    marginBottom: 4,
  },
  lastTestName: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#14b8a6',
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
    color: '#14b8a6',
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
    marginBottom: 8,
  },
});
