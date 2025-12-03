import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
} from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { RootStackParamList } from '../navigation/AppNavigator';
import { faro, trackUserAction } from '@grafana/faro-react-native';
import { SpanStatusCode } from '@opentelemetry/api';

type Props = NativeStackScreenProps<RootStackParamList, 'Showcase'>;

// Demo user profiles for showcasing different user scenarios
const DEMO_USERS = [
  {
    id: 'user-alice-premium',
    username: 'alice_premium',
    email: 'alice@company.com',
    attributes: {
      plan: 'premium',
      role: 'admin',
      signupDate: '2023-01-15',
      company: 'Acme Corp',
    },
    displayName: 'Alice (Premium Admin)',
    color: '#8b5cf6',
  },
  {
    id: 'user-bob-standard',
    username: 'bob_standard',
    email: 'bob@example.com',
    attributes: {
      plan: 'standard',
      role: 'user',
      signupDate: '2024-03-22',
      company: 'Example Inc',
    },
    displayName: 'Bob (Standard User)',
    color: '#3b82f6',
  },
  {
    id: 'user-charlie-free',
    username: 'charlie_free',
    email: 'charlie@demo.com',
    attributes: {
      plan: 'free',
      role: 'user',
      signupDate: '2024-11-01',
      company: 'Demo LLC',
    },
    displayName: 'Charlie (Free Tier)',
    color: '#10b981',
  },
  {
    id: 'user-dana-enterprise',
    username: 'dana_enterprise',
    email: 'dana@enterprise.com',
    attributes: {
      plan: 'enterprise',
      role: 'super_admin',
      signupDate: '2022-06-10',
      company: 'Enterprise Solutions',
    },
    displayName: 'Dana (Enterprise)',
    color: '#f59e0b',
  },
];

export function ShowcaseScreen({ navigation }: Props) {
  const [currentUser, setCurrentUser] = useState(DEMO_USERS[0]);
  const [actionCounts, setActionCounts] = useState({
    logs: 0,
    events: 0,
    httpRequests: 0,
    errors: 0,
    traces: 0,
  });
  const [loading, setLoading] = useState(false);
  const [lastTraceId, setLastTraceId] = useState<string | null>(null);

  // Set initial user on mount
  useEffect(() => {
    switchUser(DEMO_USERS[0]);
  }, []);

  const switchUser = (user: typeof DEMO_USERS[0]) => {
    setCurrentUser(user);

    // Update Faro with new user info
    faro.api.setUser({
      id: user.id,
      username: user.username,
      email: user.email,
      attributes: user.attributes,
    });

    // Track user switch event
    faro.api.pushEvent('showcase_user_switched', {
      newUserId: user.id,
      newUsername: user.username,
      plan: user.attributes.plan,
      role: user.attributes.role,
    });

    // Reset action counts for the new user
    setActionCounts({
      logs: 0,
      events: 0,
      httpRequests: 0,
      errors: 0,
      traces: 0,
    });

    Alert.alert(
      'User Switched',
      `Now demonstrating as:\n${user.displayName}\n\nAll telemetry will be associated with this user.`
    );
  };

  // Demo Action 1: Send Various Logs
  const handleSendLogs = () => {
    console.log(`[${currentUser.username}] User performed a standard action`);
    console.info(`[${currentUser.username}] Informational message about ${currentUser.attributes.plan} plan`);
    console.warn(`[${currentUser.username}] Warning: Approaching usage limit`);

    faro.api.pushLog([`Custom log from ${currentUser.displayName}`], {
      context: 'showcase-demo',
      level: 'info',
    });

    setActionCounts(prev => ({ ...prev, logs: prev.logs + 4 }));
    Alert.alert('Logs Sent', `4 log messages sent for ${currentUser.displayName}`);
  };

  // Demo Action 2: Send Custom Events
  const handleSendEvents = () => {
    // Different events based on user plan
    const planSpecificEvent = {
      premium: 'premium_feature_accessed',
      enterprise: 'enterprise_dashboard_viewed',
      standard: 'standard_feature_used',
      free: 'free_tier_action',
    }[currentUser.attributes.plan];

    faro.api.pushEvent(planSpecificEvent, {
      userId: currentUser.id,
      plan: currentUser.attributes.plan,
      role: currentUser.attributes.role,
      timestamp: new Date().toISOString(),
    });

    faro.api.pushEvent('showcase_button_clicked', {
      buttonType: 'send_events',
      username: currentUser.username,
      company: currentUser.attributes.company,
    });

    setActionCounts(prev => ({ ...prev, events: prev.events + 2 }));
    Alert.alert(
      'Events Sent',
      `Plan-specific event: ${planSpecificEvent}\n\nThese events will appear in your Grafana dashboard.`
    );
  };

  // Demo Action 3: Simulated HTTP Requests
  const handleHttpRequests = async () => {
    setLoading(true);
    try {
      // Simulate different API endpoints based on user role
      const endpoints = {
        admin: 'https://jsonplaceholder.typicode.com/users',
        super_admin: 'https://jsonplaceholder.typicode.com/users/1',
        user: 'https://jsonplaceholder.typicode.com/posts/1',
      };

      const endpoint = endpoints[currentUser.attributes.role as keyof typeof endpoints] || endpoints.user;

      const response = await fetch(endpoint);
      const data = await response.json();

      faro.api.pushEvent('showcase_http_completed', {
        endpoint,
        status: String(response.status),
        role: currentUser.attributes.role,
        userId: currentUser.id,
      });

      setActionCounts(prev => ({ ...prev, httpRequests: prev.httpRequests + 1 }));

      Alert.alert(
        'HTTP Request Completed',
        `Role-based endpoint: ${endpoint}\n\nStatus: ${response.status}\n\nHTTP requests are automatically traced!`
      );
    } catch (error) {
      Alert.alert('Error', `HTTP request failed: ${error}`);
    } finally {
      setLoading(false);
    }
  };

  // Demo Action 4: Generate Errors (different severity)
  const handleGenerateError = () => {
    const errorTypes = [
      {
        type: 'ValidationError',
        message: `${currentUser.attributes.plan} plan validation failed`,
        severity: 'low',
      },
      {
        type: 'AuthorizationError',
        message: `User ${currentUser.username} lacks permission`,
        severity: 'medium',
      },
      {
        type: 'DataError',
        message: `Data inconsistency detected for ${currentUser.id}`,
        severity: 'high',
      },
    ];

    const randomError = errorTypes[Math.floor(Math.random() * errorTypes.length)];

    // Log the error
    console.error(`[${currentUser.username}] ${randomError.type}: ${randomError.message}`);

    // Push error to Faro
    faro.api.pushError(new Error(randomError.message), {
      type: randomError.type,
      context: 'showcase-demo',
    });

    faro.api.pushEvent('showcase_error_generated', {
      errorType: randomError.type,
      severity: randomError.severity,
      userId: currentUser.id,
      username: currentUser.username,
    });

    setActionCounts(prev => ({ ...prev, errors: prev.errors + 1 }));

    Alert.alert(
      'Error Generated',
      `Type: ${randomError.type}\nSeverity: ${randomError.severity}\n\nThis error is now tracked in Grafana Cloud.`
    );
  };

  // Demo Action 5: Create Distributed Trace
  const handleCreateTrace = async () => {
    const otel = (faro as any).otel;
    if (!otel) {
      Alert.alert('Error', 'OTEL not available');
      return;
    }

    setLoading(true);
    const { trace, context } = otel;
    const tracer = trace.getTracer('showcase-demo');

    // Create a parent span for the user's workflow
    const workflowSpan = tracer.startSpan(`${currentUser.attributes.plan}-user-workflow`, {
      attributes: {
        'user.id': currentUser.id,
        'user.username': currentUser.username,
        'user.plan': currentUser.attributes.plan,
        'user.role': currentUser.attributes.role,
        'user.company': currentUser.attributes.company,
      },
    });

    try {
      await context.with(trace.setSpan(context.active(), workflowSpan), async () => {
        // Step 1: Authentication check
        const authSpan = tracer.startSpan('auth-check', {
          attributes: {
            'step': 'authentication',
            'user.role': currentUser.attributes.role,
          },
        });
        await new Promise(resolve => setTimeout(resolve, 200));
        authSpan.setStatus({ code: SpanStatusCode.OK });
        authSpan.end();

        // Step 2: Data fetch (simulate with real HTTP call)
        const response = await fetch('https://jsonplaceholder.typicode.com/posts/1');
        await response.json();

        // Step 3: Business logic
        const businessSpan = tracer.startSpan('business-logic', {
          attributes: {
            'step': 'processing',
            'user.plan': currentUser.attributes.plan,
          },
        });
        await new Promise(resolve => setTimeout(resolve, 300));
        businessSpan.addEvent('data-processed', {
          'records.count': '42',
          'processing.time': '300ms',
        });
        businessSpan.setStatus({ code: SpanStatusCode.OK });
        businessSpan.end();

        workflowSpan.setStatus({ code: SpanStatusCode.OK });
      });

      const traceId = workflowSpan.spanContext().traceId;
      setLastTraceId(traceId);

      faro.api.pushEvent('showcase_trace_created', {
        traceId,
        userId: currentUser.id,
        workflowType: `${currentUser.attributes.plan}-user-workflow`,
      });

      setActionCounts(prev => ({ ...prev, traces: prev.traces + 1 }));

      Alert.alert(
        'Trace Created',
        `Multi-step workflow traced for ${currentUser.displayName}\n\nTrace ID: ${traceId}\n\nIncludes: auth check, HTTP request, and business logic.`
      );
    } catch (error) {
      workflowSpan.setStatus({
        code: SpanStatusCode.ERROR,
        message: String(error),
      });
      Alert.alert('Error', `Trace creation failed: ${error}`);
    } finally {
      workflowSpan.end();
      setLoading(false);
    }
  };

  // Demo Action 6: Complex User Journey
  const handleComplexJourney = async () => {
    setLoading(true);

    // Track as a user action
    const action = trackUserAction('complex-user-journey', {
      userId: currentUser.id,
      plan: currentUser.attributes.plan,
    });

    try {
      // Step 1: Send logs
      console.log(`[Journey] ${currentUser.username} started complex journey`);
      await new Promise(resolve => setTimeout(resolve, 300));

      // Step 2: Make HTTP request
      await fetch('https://jsonplaceholder.typicode.com/posts/1');
      faro.api.pushEvent('journey_step_completed', { step: 'http_request' });
      await new Promise(resolve => setTimeout(resolve, 300));

      // Step 3: Perform action based on plan
      const planActions = {
        premium: 'accessed_premium_dashboard',
        enterprise: 'generated_enterprise_report',
        standard: 'viewed_standard_content',
        free: 'browsed_free_features',
      };

      faro.api.pushEvent(planActions[currentUser.attributes.plan as keyof typeof planActions], {
        userId: currentUser.id,
        timestamp: new Date().toISOString(),
      });
      await new Promise(resolve => setTimeout(resolve, 300));

      // Complete the journey
      if (action) {
        (action as any).end?.();
      }

      setActionCounts(prev => ({
        logs: prev.logs + 1,
        events: prev.events + 2,
        httpRequests: prev.httpRequests + 1,
        traces: prev.traces + 1,
      }));

      Alert.alert(
        'Journey Complete',
        `${currentUser.displayName} completed a complex user journey!\n\nIncludes: logs, HTTP requests, events, and traces.\n\nCheck your Grafana dashboard for the complete journey.`
      );
    } catch (error) {
      Alert.alert('Error', `Journey failed: ${error}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <ScrollView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.title}>SDK Showcase</Text>
        <Text style={styles.subtitle}>
          Demonstrate Faro features with different user profiles
        </Text>
      </View>

      {/* Current User Display */}
      <View style={[styles.currentUserCard, { borderLeftColor: currentUser.color }]}>
        <Text style={styles.currentUserLabel}>Current Demo User</Text>
        <Text style={[styles.currentUserName, { color: currentUser.color }]}>
          {currentUser.displayName}
        </Text>
        <View style={styles.userDetails}>
          <Text style={styles.userDetailText}>Plan: {currentUser.attributes.plan}</Text>
          <Text style={styles.userDetailText}>Role: {currentUser.attributes.role}</Text>
          <Text style={styles.userDetailText}>Company: {currentUser.attributes.company}</Text>
        </View>
      </View>

      {/* User Selector */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Switch Demo User</Text>
        <Text style={styles.sectionDescription}>
          Choose a user profile to demonstrate different scenarios in your Grafana dashboard
        </Text>
        <View style={styles.userGrid}>
          {DEMO_USERS.map((user) => (
            <TouchableOpacity
              key={user.id}
              style={[
                styles.userButton,
                { borderColor: user.color },
                currentUser.id === user.id && { backgroundColor: user.color },
              ]}
              onPress={() => switchUser(user)}
            >
              <Text
                style={[
                  styles.userButtonText,
                  { color: currentUser.id === user.id ? '#fff' : user.color },
                ]}
              >
                {user.displayName}
              </Text>
              <Text
                style={[
                  styles.userButtonSubtext,
                  { color: currentUser.id === user.id ? '#fff' : '#666' },
                ]}
              >
                {user.attributes.plan} • {user.attributes.role}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      {/* Action Stats */}
      {Object.values(actionCounts).some(count => count > 0) && (
        <View style={styles.statsCard}>
          <Text style={styles.statsTitle}>Session Activity</Text>
          <View style={styles.statsGrid}>
            <View style={styles.statItem}>
              <Text style={styles.statValue}>{actionCounts.logs}</Text>
              <Text style={styles.statLabel}>Logs</Text>
            </View>
            <View style={styles.statItem}>
              <Text style={styles.statValue}>{actionCounts.events}</Text>
              <Text style={styles.statLabel}>Events</Text>
            </View>
            <View style={styles.statItem}>
              <Text style={styles.statValue}>{actionCounts.httpRequests}</Text>
              <Text style={styles.statLabel}>HTTP</Text>
            </View>
            <View style={styles.statItem}>
              <Text style={styles.statValue}>{actionCounts.errors}</Text>
              <Text style={styles.statLabel}>Errors</Text>
            </View>
            <View style={styles.statItem}>
              <Text style={styles.statValue}>{actionCounts.traces}</Text>
              <Text style={styles.statLabel}>Traces</Text>
            </View>
          </View>
        </View>
      )}

      {loading && (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={currentUser.color} />
          <Text style={styles.loadingText}>Creating telemetry...</Text>
        </View>
      )}

      {/* Demo Actions */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Demo Actions</Text>
        <Text style={styles.sectionDescription}>
          Each action generates telemetry specific to the current user
        </Text>

        <TouchableOpacity
          style={[styles.actionButton, { backgroundColor: '#14b8a6' }]}
          onPress={handleSendLogs}
          disabled={loading}
        >
          <Text style={styles.actionButtonText}>📝 Send Logs</Text>
          <Text style={styles.actionButtonSubtext}>
            Console logs at different levels
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.actionButton, { backgroundColor: '#8b5cf6' }]}
          onPress={handleSendEvents}
          disabled={loading}
        >
          <Text style={styles.actionButtonText}>🎯 Send Events</Text>
          <Text style={styles.actionButtonSubtext}>
            Plan-specific custom events
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.actionButton, { backgroundColor: '#3b82f6' }]}
          onPress={handleHttpRequests}
          disabled={loading}
        >
          <Text style={styles.actionButtonText}>🌐 HTTP Request</Text>
          <Text style={styles.actionButtonSubtext}>
            Role-based API endpoint call
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.actionButton, { backgroundColor: '#ef4444' }]}
          onPress={handleGenerateError}
          disabled={loading}
        >
          <Text style={styles.actionButtonText}>⚠️ Generate Error</Text>
          <Text style={styles.actionButtonSubtext}>
            Random error with tracking
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.actionButton, { backgroundColor: '#f59e0b' }]}
          onPress={handleCreateTrace}
          disabled={loading}
        >
          <Text style={styles.actionButtonText}>🔍 Create Trace</Text>
          <Text style={styles.actionButtonSubtext}>
            Multi-step distributed trace
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.actionButton, { backgroundColor: '#ec4899' }]}
          onPress={handleComplexJourney}
          disabled={loading}
        >
          <Text style={styles.actionButtonText}>🚀 Complex Journey</Text>
          <Text style={styles.actionButtonSubtext}>
            Full user journey with all telemetry types
          </Text>
        </TouchableOpacity>
      </View>

      {/* Last Trace ID */}
      {lastTraceId && (
        <View style={styles.traceCard}>
          <Text style={styles.traceLabel}>Latest Trace ID:</Text>
          <Text style={styles.traceId} selectable>
            {lastTraceId}
          </Text>
          <Text style={styles.traceHint}>
            Copy this ID to query in Grafana Cloud → Explore → Tempo
          </Text>
        </View>
      )}

      {/* Footer Tips */}
      <View style={styles.footer}>
        <Text style={styles.footerTitle}>💡 Demo Tips</Text>
        <Text style={styles.footerText}>
          • Switch between users to see how telemetry is tagged differently
        </Text>
        <Text style={styles.footerText}>
          • Use Grafana dashboards to filter by user ID, plan, or role
        </Text>
        <Text style={styles.footerText}>
          • Complex Journey showcases the full SDK capabilities in one flow
        </Text>
        <Text style={styles.footerText}>
          • All actions are automatically tracked with user context
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
  currentUserCard: {
    margin: 20,
    padding: 16,
    backgroundColor: '#f8f9fa',
    borderRadius: 8,
    borderLeftWidth: 4,
  },
  currentUserLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: '#6c757d',
    textTransform: 'uppercase',
    marginBottom: 4,
  },
  currentUserName: {
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 8,
  },
  userDetails: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  userDetailText: {
    fontSize: 13,
    color: '#495057',
  },
  section: {
    padding: 20,
    borderTopWidth: 1,
    borderTopColor: '#dee2e6',
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#212529',
    marginBottom: 8,
  },
  sectionDescription: {
    fontSize: 14,
    color: '#6c757d',
    marginBottom: 16,
    lineHeight: 20,
  },
  userGrid: {
    gap: 12,
  },
  userButton: {
    padding: 16,
    borderRadius: 8,
    borderWidth: 2,
    backgroundColor: '#fff',
  },
  userButtonText: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 4,
  },
  userButtonSubtext: {
    fontSize: 13,
  },
  statsCard: {
    margin: 20,
    marginTop: 0,
    padding: 16,
    backgroundColor: '#e7f3ff',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#cce5ff',
  },
  statsTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#004085',
    marginBottom: 12,
    textAlign: 'center',
  },
  statsGrid: {
    flexDirection: 'row',
    justifyContent: 'space-around',
  },
  statItem: {
    alignItems: 'center',
  },
  statValue: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#004085',
  },
  statLabel: {
    fontSize: 12,
    color: '#6c757d',
    marginTop: 4,
  },
  loadingContainer: {
    padding: 20,
    alignItems: 'center',
    backgroundColor: '#f8f9fa',
    marginHorizontal: 20,
    borderRadius: 8,
    marginBottom: 20,
  },
  loadingText: {
    marginTop: 10,
    fontSize: 14,
    color: '#495057',
  },
  actionButton: {
    padding: 16,
    borderRadius: 8,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  actionButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#fff',
    marginBottom: 4,
  },
  actionButtonSubtext: {
    fontSize: 13,
    color: 'rgba(255, 255, 255, 0.8)',
  },
  traceCard: {
    margin: 20,
    marginTop: 0,
    padding: 16,
    backgroundColor: '#f0fdf4',
    borderRadius: 8,
    borderLeftWidth: 4,
    borderLeftColor: '#10b981',
  },
  traceLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: '#065f46',
    marginBottom: 8,
  },
  traceId: {
    fontSize: 12,
    fontFamily: 'monospace',
    color: '#10b981',
    marginBottom: 8,
    lineHeight: 18,
  },
  traceHint: {
    fontSize: 12,
    color: '#6c757d',
    fontStyle: 'italic',
  },
  footer: {
    padding: 20,
    backgroundColor: '#fff3cd',
    borderTopWidth: 1,
    borderTopColor: '#ffc107',
  },
  footerTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#856404',
    marginBottom: 12,
  },
  footerText: {
    fontSize: 13,
    color: '#856404',
    lineHeight: 20,
    marginBottom: 6,
  },
});
