import { SpanStatusCode } from '@opentelemetry/api';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import React, { useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';

import { faro, trackUserAction } from '@grafana/faro-react-native';

import { useFaroUser } from '../hooks/useFaroUser';
import type { RootStackParamList } from '../navigation/AppNavigator';
import { DEMO_USERS } from '../utils/randomUser';

type Props = NativeStackScreenProps<RootStackParamList, 'Showcase'>;

// Map demo users to showcase format with colors
const SHOWCASE_USERS = DEMO_USERS.map((user, index) => {
  const colors = ['#8b5cf6', '#3b82f6', '#10b981', '#f59e0b', '#ec4899'];
  return {
    ...user,
    displayName: `${user.username} (${user.attributes.role})`,
    color: colors[index % colors.length],
  };
});

type ShowcaseUser = (typeof SHOWCASE_USERS)[0];

export function ShowcaseScreen(_props: Props) {
  const faroUser = useFaroUser();

  // Map Faro user to ShowcaseUser with color
  const currentUser: ShowcaseUser | null = faroUser
    ? SHOWCASE_USERS.find(u => u.id === faroUser.id) || SHOWCASE_USERS[0]
    : null;

  const [actionCounts, setActionCounts] = useState({
    logs: 0,
    events: 0,
    httpRequests: 0,
    errors: 0,
    traces: 0,
  });
  const [loading, setLoading] = useState(false);
  const [lastTraceId, setLastTraceId] = useState<string | null>(null);

  const switchUser = (user: ShowcaseUser) => {
    // No need to setCurrentUser - it will update automatically via useFaroUser hook

    // Update Faro with new user info
    if (faro?.api) {
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
    }

    // Reset action counts for the new user
    setActionCounts({
      logs: 0,
      events: 0,
      httpRequests: 0,
      errors: 0,
      traces: 0,
    });
  };

  // Demo Action 1: Send Various Logs
  const handleSendLogs = () => {
    if (!currentUser) return;

    // Random realistic log messages
    const logMessages = [
      { level: 'log', msg: 'User navigated to dashboard page' },
      { level: 'log', msg: 'Successfully loaded user preferences' },
      { level: 'log', msg: 'Initiated data sync operation' },
      { level: 'info', msg: 'Cache hit for user profile data' },
      { level: 'info', msg: 'WebSocket connection established' },
      { level: 'info', msg: 'Background task completed successfully' },
      { level: 'warn', msg: 'API response time exceeded 2s threshold' },
      { level: 'warn', msg: 'Local storage approaching 80% capacity' },
      { level: 'warn', msg: 'Retry attempt 2 of 3 for failed request' },
      { level: 'log', msg: 'User session refreshed automatically' },
    ];

    // Pick 3-5 random log messages
    const numLogs = Math.floor(Math.random() * 3) + 3; // 3-5 logs
    const selectedLogs = [];

    for (let i = 0; i < numLogs; i++) {
      const randomLog =
        logMessages[Math.floor(Math.random() * logMessages.length)];
      selectedLogs.push(randomLog);

      const message = `[${currentUser.username}] ${randomLog.msg}`;

      switch (randomLog.level) {
        case 'warn':
          console.warn(message);
          break;
        case 'info':
          console.info(message);
          break;
        default:
          console.log(message);
      }
    }

    setActionCounts(prev => ({ ...prev, logs: prev.logs + numLogs }));
  };

  // Demo Action 2: Send Custom Events
  const handleSendEvents = () => {
    if (!currentUser) return;
    // Realistic app events to choose from
    const eventOptions = [
      {
        name: 'feature_accessed',
        attrs: {
          feature: 'analytics_dashboard',
          duration_ms: Math.floor(Math.random() * 2000) + 500,
        },
      },
      {
        name: 'report_generated',
        attrs: {
          report_type: 'quarterly_summary',
          format: 'pdf',
          pages: Math.floor(Math.random() * 20) + 5,
        },
      },
      {
        name: 'settings_updated',
        attrs: {
          setting_category: 'notifications',
          change_count: Math.floor(Math.random() * 5) + 1,
        },
      },
      {
        name: 'search_performed',
        attrs: {
          query_length: Math.floor(Math.random() * 30) + 5,
          results_count: Math.floor(Math.random() * 100),
        },
      },
      {
        name: 'export_completed',
        attrs: {
          format: ['csv', 'json', 'xlsx'][Math.floor(Math.random() * 3)],
          record_count: Math.floor(Math.random() * 1000) + 100,
        },
      },
      {
        name: 'filter_applied',
        attrs: {
          filter_type: ['date_range', 'category', 'status'][
            Math.floor(Math.random() * 3)
          ],
          items_filtered: Math.floor(Math.random() * 500),
        },
      },
      {
        name: 'notification_viewed',
        attrs: {
          notification_type: ['alert', 'info', 'warning'][
            Math.floor(Math.random() * 3)
          ],
          age_hours: Math.floor(Math.random() * 48),
        },
      },
      {
        name: 'collaboration_invite_sent',
        attrs: {
          recipient_count: Math.floor(Math.random() * 5) + 1,
          workspace: 'team_dashboard',
        },
      },
      {
        name: 'data_refresh_triggered',
        attrs: {
          data_source: ['api', 'database', 'cache'][
            Math.floor(Math.random() * 3)
          ],
          auto: Math.random() > 0.5,
        },
      },
      {
        name: 'widget_customized',
        attrs: {
          widget_type: ['chart', 'table', 'metric'][
            Math.floor(Math.random() * 3)
          ],
          action: ['resize', 'reorder', 'configure'][
            Math.floor(Math.random() * 3)
          ],
        },
      },
    ];

    // Pick 1-3 random events
    const numEvents = Math.floor(Math.random() * 3) + 1; // 1-3 events
    const selectedEvents = [];

    for (let i = 0; i < numEvents; i++) {
      const randomEvent =
        eventOptions[Math.floor(Math.random() * eventOptions.length)];
      selectedEvents.push(randomEvent.name);

      // Convert all attributes to strings for Faro
      const stringAttrs: Record<string, string> = {};
      for (const [key, value] of Object.entries(randomEvent.attrs)) {
        stringAttrs[key] = String(value);
      }

      faro.api.pushEvent(randomEvent.name, {
        userId: currentUser.id,
        plan: currentUser.attributes.plan,
        role: currentUser.attributes.role,
        company: currentUser.attributes.company || 'Unknown',
        timestamp: new Date().toISOString(),
        ...stringAttrs,
      });
    }

    setActionCounts(prev => ({ ...prev, events: prev.events + numEvents }));
  };

  // Demo Action 3: Simulated HTTP Requests
  const handleHttpRequests = async () => {
    if (!currentUser) return;

    setLoading(true);

    // Realistic API endpoints with varied resources and dynamic IDs
    const endpointOptions = [
      {
        baseUrl: 'https://jsonplaceholder.typicode.com/posts',
        resource: 'post_data',
        method: 'GET',
        idRange: 100,
      },
      {
        baseUrl: 'https://jsonplaceholder.typicode.com/users',
        resource: 'user_profile',
        method: 'GET',
        idRange: 10,
      },
      {
        baseUrl: 'https://jsonplaceholder.typicode.com/comments',
        resource: 'comments_list',
        method: 'GET',
        query: true,
      },
      {
        baseUrl: 'https://jsonplaceholder.typicode.com/todos',
        resource: 'todo_item',
        method: 'GET',
        idRange: 200,
      },
      {
        baseUrl: 'https://jsonplaceholder.typicode.com/albums',
        resource: 'albums_collection',
        method: 'GET',
        idRange: 100,
      },
      {
        baseUrl: 'https://jsonplaceholder.typicode.com/photos',
        resource: 'photo_gallery',
        method: 'GET',
        query: true,
      },
      {
        baseUrl: 'https://jsonplaceholder.typicode.com/users',
        resource: 'users_directory',
        method: 'GET',
        collection: true,
      },
      {
        baseUrl: 'https://jsonplaceholder.typicode.com/posts',
        resource: 'user_posts',
        method: 'GET',
        query: true,
      },
      {
        baseUrl: 'https://httpbin.org/delay',
        resource: 'slow_operation',
        method: 'GET',
        delayParam: true,
      },
      {
        baseUrl: 'https://jsonplaceholder.typicode.com/posts',
        resource: 'post_comments',
        method: 'GET',
        commentsPath: true,
      },
    ];

    const selectedEndpoint =
      endpointOptions[Math.floor(Math.random() * endpointOptions.length)];

    // Build the URL with random parameters
    let url = selectedEndpoint.baseUrl;

    if (
      selectedEndpoint.idRange &&
      !selectedEndpoint.collection &&
      !selectedEndpoint.query
    ) {
      // Add random ID to path
      const randomId =
        Math.floor(Math.random() * selectedEndpoint.idRange) + 1;
      url = `${url}/${randomId}`;
    } else if (selectedEndpoint.query) {
      // Add query parameters
      if (selectedEndpoint.resource === 'comments_list') {
        const postId = Math.floor(Math.random() * 100) + 1;
        url = `${url}?postId=${postId}`;
      } else if (selectedEndpoint.resource === 'photo_gallery') {
        const albumId = Math.floor(Math.random() * 100) + 1;
        url = `${url}?albumId=${albumId}`;
      } else if (selectedEndpoint.resource === 'user_posts') {
        const userId = Math.floor(Math.random() * 10) + 1;
        url = `${url}?userId=${userId}`;
      }
    } else if (selectedEndpoint.delayParam) {
      // Add random delay between 1-3 seconds
      const delay = Math.floor(Math.random() * 3) + 1;
      url = `${url}/${delay}`;
    } else if (selectedEndpoint.commentsPath) {
      const postId = Math.floor(Math.random() * 100) + 1;
      url = `${url}/${postId}/comments`;
    }

    const response = await fetch(url);
    const data = await response.json();

    faro.api.pushEvent('api_request_completed', {
      endpoint: url,
      resource: selectedEndpoint.resource,
      method: selectedEndpoint.method,
      status: String(response.status),
      role: currentUser.attributes.role,
      userId: currentUser.id,
      response_size: String(JSON.stringify(data).length),
    });

    setActionCounts(prev => ({
      ...prev,
      httpRequests: prev.httpRequests + 1,
    }));

    setLoading(false);
  };

  // Demo Action 4: Generate Errors (different severity)
  const handleGenerateError = () => {
    if (!currentUser) return;
    // Realistic error scenarios
    const errorTypes = [
      {
        type: 'ValidationError',
        message: 'Email format validation failed for user input',
        severity: 'low',
        code: 'VAL_001',
      },
      {
        type: 'AuthorizationError',
        message: 'Insufficient permissions to access admin dashboard',
        severity: 'medium',
        code: 'AUTH_403',
      },
      {
        type: 'NetworkError',
        message: 'Failed to fetch data from API server - timeout after 30s',
        severity: 'high',
        code: 'NET_TIMEOUT',
      },
      {
        type: 'DataError',
        message: 'Database query returned malformed JSON response',
        severity: 'high',
        code: 'DATA_PARSE',
      },
      {
        type: 'RateLimitError',
        message: 'API rate limit exceeded - 1000 requests per hour',
        severity: 'medium',
        code: 'RATE_429',
      },
      {
        type: 'ConfigurationError',
        message: 'Missing required environment variable: API_KEY',
        severity: 'critical',
        code: 'CFG_MISSING',
      },
      {
        type: 'CacheError',
        message: 'Redis connection lost - falling back to memory cache',
        severity: 'medium',
        code: 'CACHE_CONN',
      },
      {
        type: 'FileUploadError',
        message: 'File size exceeds maximum allowed limit of 10MB',
        severity: 'low',
        code: 'UPLOAD_SIZE',
      },
      {
        type: 'SessionExpiredError',
        message: 'User session expired - please log in again',
        severity: 'low',
        code: 'SESSION_EXP',
      },
      {
        type: 'IntegrationError',
        message: 'Third-party payment service returned error 500',
        severity: 'critical',
        code: 'INT_PAYMENT',
      },
    ];

    const randomError =
      errorTypes[Math.floor(Math.random() * errorTypes.length)];

    // Log the error
    console.error(
      `[${currentUser.username}] ${randomError.type}: ${randomError.message}`,
    );

    // Push error to Faro
    const error = new Error(randomError.message);
    (error as any).type = randomError.type;
    faro.api.pushError(error);

    faro.api.pushEvent('error_occurred', {
      errorType: randomError.type,
      errorCode: randomError.code,
      severity: randomError.severity,
      userId: currentUser.id,
      username: currentUser.username,
      plan: currentUser.attributes.plan,
      timestamp: new Date().toISOString(),
    });

    setActionCounts(prev => ({ ...prev, errors: prev.errors + 1 }));
  };

  // Demo Action 5: Create Distributed Trace
  const handleCreateTrace = async () => {
    if (!currentUser) return;

    const otel = (faro as any).otel;
    if (!otel) {
      Alert.alert('Error', 'OTEL not available');
      return;
    }

    setLoading(true);
    const { trace, context } = otel;
    const tracer = trace.getTracer('showcase-demo');

    // Realistic workflow types to choose from
    const workflowTypes = [
      {
        name: 'data-export-workflow',
        steps: [
          { name: 'validate-permissions', duration: 150 },
          {
            name: 'query-database',
            duration: 400,
            event: 'rows-fetched',
            eventData: { count: Math.floor(Math.random() * 1000) + 100 },
          },
          { name: 'transform-data', duration: 250 },
          {
            name: 'generate-file',
            duration: 300,
            event: 'file-created',
            eventData: { size_kb: Math.floor(Math.random() * 5000) + 500 },
          },
        ],
      },
      {
        name: 'report-generation-workflow',
        steps: [
          { name: 'fetch-user-data', duration: 200 },
          {
            name: 'aggregate-metrics',
            duration: 350,
            event: 'metrics-calculated',
            eventData: { metric_count: Math.floor(Math.random() * 50) + 10 },
          },
          { name: 'render-charts', duration: 450 },
          {
            name: 'compile-pdf',
            duration: 500,
            event: 'pdf-ready',
            eventData: { pages: Math.floor(Math.random() * 30) + 5 },
          },
        ],
      },
      {
        name: 'user-onboarding-workflow',
        steps: [
          { name: 'create-account', duration: 180 },
          { name: 'send-welcome-email', duration: 220 },
          {
            name: 'setup-preferences',
            duration: 150,
            event: 'preferences-saved',
            eventData: { settings_count: 12 },
          },
          { name: 'initialize-workspace', duration: 280 },
        ],
      },
      {
        name: 'data-sync-workflow',
        steps: [
          { name: 'check-last-sync', duration: 100 },
          {
            name: 'fetch-remote-changes',
            duration: 600,
            event: 'changes-detected',
            eventData: { change_count: Math.floor(Math.random() * 200) + 20 },
          },
          { name: 'merge-conflicts', duration: 250 },
          { name: 'update-local-store', duration: 300 },
        ],
      },
      {
        name: 'analytics-processing-workflow',
        steps: [
          { name: 'load-raw-events', duration: 400 },
          {
            name: 'filter-by-criteria',
            duration: 200,
            event: 'events-filtered',
            eventData: {
              filtered_count: Math.floor(Math.random() * 5000) + 1000,
            },
          },
          { name: 'compute-aggregates', duration: 350 },
          { name: 'store-results', duration: 180 },
        ],
      },
      {
        name: 'payment-processing-workflow',
        steps: [
          { name: 'validate-payment-info', duration: 150 },
          { name: 'charge-payment-method', duration: 800 },
          {
            name: 'update-subscription',
            duration: 200,
            event: 'subscription-updated',
            eventData: { plan: currentUser.attributes.plan },
          },
          { name: 'send-receipt', duration: 250 },
        ],
      },
      {
        name: 'backup-workflow',
        steps: [
          {
            name: 'snapshot-database',
            duration: 700,
            event: 'snapshot-created',
            eventData: { size_mb: Math.floor(Math.random() * 5000) + 1000 },
          },
          { name: 'compress-data', duration: 450 },
          { name: 'upload-to-storage', duration: 900 },
          { name: 'verify-backup', duration: 200 },
        ],
      },
      {
        name: 'notification-workflow',
        steps: [
          { name: 'fetch-user-preferences', duration: 120 },
          { name: 'build-notification', duration: 150 },
          {
            name: 'send-push-notification',
            duration: 300,
            event: 'notification-sent',
            eventData: { channel: 'push' },
          },
          { name: 'log-delivery', duration: 100 },
        ],
      },
      {
        name: 'search-workflow',
        steps: [
          { name: 'parse-query', duration: 80 },
          {
            name: 'search-index',
            duration: 400,
            event: 'results-found',
            eventData: { result_count: Math.floor(Math.random() * 500) + 50 },
          },
          { name: 'rank-results', duration: 200 },
          { name: 'apply-filters', duration: 150 },
        ],
      },
      {
        name: 'cache-refresh-workflow',
        steps: [
          { name: 'check-cache-status', duration: 100 },
          { name: 'fetch-fresh-data', duration: 500 },
          {
            name: 'invalidate-old-cache',
            duration: 120,
            event: 'cache-cleared',
            eventData: { keys_removed: Math.floor(Math.random() * 100) + 20 },
          },
          { name: 'populate-new-cache', duration: 250 },
        ],
      },
    ];

    const selectedWorkflow =
      workflowTypes[Math.floor(Math.random() * workflowTypes.length)];

    // Create a parent span for the user's workflow
    const workflowSpan = tracer.startSpan(selectedWorkflow.name, {
      attributes: {
        'user.id': currentUser.id,
        'user.username': currentUser.username,
        'user.plan': currentUser.attributes.plan,
        'user.role': currentUser.attributes.role,
        'user.company': currentUser.attributes.company || 'Unknown',
        'workflow.type': selectedWorkflow.name,
      },
    });

    await context.with(
      trace.setSpan(context.active(), workflowSpan),
      async () => {
        // Execute each step in the workflow
        for (const step of selectedWorkflow.steps) {
          const stepSpan = tracer.startSpan(step.name, {
            attributes: {
              'step.name': step.name,
              'step.duration_ms': step.duration,
            },
          });

          await new Promise<void>(resolve =>
            setTimeout(resolve, step.duration),
          );

          if (step.event) {
            stepSpan.addEvent(step.event, step.eventData || {});
          }

          stepSpan.setStatus({ code: SpanStatusCode.OK });
          stepSpan.end();
        }

        workflowSpan.setStatus({ code: SpanStatusCode.OK });
      },
    );

    const traceId = workflowSpan.spanContext().traceId;
    setLastTraceId(traceId);

    faro.api.pushEvent('workflow_completed', {
      traceId,
      userId: currentUser.id,
      workflowType: selectedWorkflow.name,
      stepCount: String(selectedWorkflow.steps.length),
      totalDuration: String(
        selectedWorkflow.steps.reduce((sum, s) => sum + s.duration, 0),
      ),
    });

    setActionCounts(prev => ({ ...prev, traces: prev.traces + 1 }));

    workflowSpan.end();
    setLoading(false);
  };

  // Demo Action 6: Complex User Journey
  const handleComplexJourney = async () => {
    if (!currentUser) return;

    setLoading(true);

    // Helper function to generate random URLs
    const getRandomUrl = () => {
      const urls = [
        `https://jsonplaceholder.typicode.com/users/${
          Math.floor(Math.random() * 10) + 1
        }`,
        `https://jsonplaceholder.typicode.com/posts/${
          Math.floor(Math.random() * 100) + 1
        }`,
        `https://jsonplaceholder.typicode.com/comments?postId=${
          Math.floor(Math.random() * 100) + 1
        }`,
        `https://jsonplaceholder.typicode.com/todos/${
          Math.floor(Math.random() * 200) + 1
        }`,
        `https://jsonplaceholder.typicode.com/albums/${
          Math.floor(Math.random() * 100) + 1
        }`,
        `https://jsonplaceholder.typicode.com/photos?albumId=${
          Math.floor(Math.random() * 100) + 1
        }`,
        'https://jsonplaceholder.typicode.com/users',
        `https://jsonplaceholder.typicode.com/posts?userId=${
          Math.floor(Math.random() * 10) + 1
        }`,
      ];
      return urls[Math.floor(Math.random() * urls.length)];
    };

    // Realistic user journey scenarios
    const journeyTypes = [
      {
        name: 'onboarding-journey',
        steps: [
          {
            type: 'log',
            message: 'User started onboarding process',
            delay: 200,
          },
          { type: 'http', url: getRandomUrl(), delay: 300 },
          {
            type: 'event',
            name: 'profile_completed',
            attrs: { completion_rate: 100 },
            delay: 200,
          },
          { type: 'log', message: 'Welcome email queued', delay: 150 },
          {
            type: 'event',
            name: 'tutorial_started',
            attrs: { tutorial_id: 'getting-started' },
            delay: 0,
          },
        ],
      },
      {
        name: 'content-creation-journey',
        steps: [
          { type: 'log', message: 'User opened content editor', delay: 150 },
          {
            type: 'event',
            name: 'editor_loaded',
            attrs: { editor_type: 'rich-text' },
            delay: 200,
          },
          { type: 'http', url: getRandomUrl(), delay: 250 },
          { type: 'log', message: 'Draft auto-saved', delay: 300 },
          {
            type: 'event',
            name: 'content_published',
            attrs: { word_count: Math.floor(Math.random() * 2000) + 500 },
            delay: 0,
          },
        ],
      },
      {
        name: 'data-analysis-journey',
        steps: [
          {
            type: 'log',
            message: 'User navigated to analytics dashboard',
            delay: 180,
          },
          { type: 'http', url: getRandomUrl(), delay: 400 },
          {
            type: 'event',
            name: 'filter_applied',
            attrs: { filter_type: 'date_range', days: 30 },
            delay: 150,
          },
          {
            type: 'log',
            message: 'Chart rendered with 1,247 data points',
            delay: 200,
          },
          { type: 'http', url: getRandomUrl(), delay: 350 },
          {
            type: 'event',
            name: 'report_exported',
            attrs: { format: 'csv', rows: 1247 },
            delay: 0,
          },
        ],
      },
      {
        name: 'collaboration-journey',
        steps: [
          { type: 'log', message: 'User opened shared workspace', delay: 150 },
          { type: 'http', url: getRandomUrl(), delay: 280 },
          {
            type: 'event',
            name: 'teammate_invited',
            attrs: { invitee_count: 3 },
            delay: 200,
          },
          {
            type: 'log',
            message: 'Permissions updated for workspace members',
            delay: 150,
          },
          {
            type: 'event',
            name: 'comment_posted',
            attrs: { thread_id: 'ws-42' },
            delay: 0,
          },
        ],
      },
      {
        name: 'shopping-journey',
        steps: [
          { type: 'log', message: 'User browsing product catalog', delay: 200 },
          { type: 'http', url: getRandomUrl(), delay: 350 },
          {
            type: 'event',
            name: 'product_viewed',
            attrs: { product_id: 'prod-' + Math.floor(Math.random() * 1000) },
            delay: 150,
          },
          {
            type: 'event',
            name: 'added_to_cart',
            attrs: { quantity: Math.floor(Math.random() * 3) + 1 },
            delay: 200,
          },
          { type: 'http', url: getRandomUrl(), delay: 400 },
          {
            type: 'event',
            name: 'checkout_initiated',
            attrs: { cart_total: Math.floor(Math.random() * 500) + 50 },
            delay: 0,
          },
        ],
      },
    ];

    const selectedJourney =
      journeyTypes[Math.floor(Math.random() * journeyTypes.length)];

    // Track as a user action
    const action = trackUserAction(selectedJourney.name, {
      userId: currentUser.id,
      plan: currentUser.attributes.plan,
    });

    let logCount = 0;
    let eventCount = 0;
    let httpCount = 0;

    console.log(
      `[Journey] ${currentUser.username} started ${selectedJourney.name}`,
    );

    for (const step of selectedJourney.steps) {
      switch (step.type) {
        case 'log':
          if ('message' in step) {
            console.log(`[${currentUser.username}] ${step.message}`);
            logCount++;
          }
          break;
        case 'http':
          if ('url' in step && step.url) {
            await fetch(step.url);
            httpCount++;
          }
          break;
        case 'event':
          if ('name' in step && step.name) {
            // Convert attrs to strings
            const stringAttrs: Record<string, string> = {};
            if ('attrs' in step && step.attrs) {
              for (const [key, value] of Object.entries(step.attrs)) {
                stringAttrs[key] = String(value);
              }
            }

            faro.api.pushEvent(step.name, {
              userId: currentUser.id,
              plan: currentUser.attributes.plan,
              role: currentUser.attributes.role,
              timestamp: new Date().toISOString(),
              ...stringAttrs,
            });
            eventCount++;
          }
          break;
      }

      if (step.delay > 0) {
        await new Promise<void>(resolve => setTimeout(resolve, step.delay));
      }
    }

    // Complete the journey
    if (action) {
      (action as any).end?.();
    }

    setActionCounts(prev => ({
      logs: prev.logs + logCount,
      events: prev.events + eventCount,
      httpRequests: prev.httpRequests + httpCount,
      errors: prev.errors,
      traces: prev.traces + 1,
    }));

    setLoading(false);
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
      {currentUser && (
        <View
          style={[
            styles.currentUserCard,
            { borderLeftColor: currentUser.color },
          ]}
        >
          <Text style={styles.currentUserLabel}>Current Demo User</Text>
          <Text style={[styles.currentUserName, { color: currentUser.color }]}>
            {currentUser.displayName}
          </Text>
          <View style={styles.userDetails}>
            <Text style={styles.userDetailText}>
              Plan: {currentUser.attributes.plan}
            </Text>
            <Text style={styles.userDetailText}>
              Role: {currentUser.attributes.role}
            </Text>
            {currentUser.attributes.company && (
              <Text style={styles.userDetailText}>
                Company: {currentUser.attributes.company}
              </Text>
            )}
          </View>
        </View>
      )}

      {/* User Selector */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Switch Demo User</Text>
        <Text style={styles.sectionDescription}>
          Choose a user profile to demonstrate different scenarios in your
          Grafana dashboard
        </Text>
        <View style={styles.userGrid}>
          {SHOWCASE_USERS.map(user => (
            <TouchableOpacity
              key={user.id}
              style={[
                styles.userButton,
                { borderColor: user.color },
                currentUser?.id === user.id && { backgroundColor: user.color },
              ]}
              onPress={() => switchUser(user)}
            >
              <Text
                style={[
                  styles.userButtonText,
                  {
                    color: currentUser?.id === user.id ? '#fff' : user.color,
                  },
                ]}
              >
                {user.displayName}
              </Text>
              <Text
                style={[
                  styles.userButtonSubtext,
                  { color: currentUser?.id === user.id ? '#fff' : '#666' },
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

      {loading && currentUser && (
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
