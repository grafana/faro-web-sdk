import React from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';

import { faro } from '@grafana/faro-react-native';

import { PerformanceMetricsCard } from '../components/PerformanceMetricsCard';

/**
 * Device Info Screen
 * Displays live performance metrics and device metadata
 */
export default function DeviceInfoScreen() {
  // Get synchronous device info from Faro's browser meta
  const browserMeta = (faro?.metas?.value?.browser as any) || {};

  const renderMetaField = (label: string, value: any) => {
    if (value === undefined || value === null) {
      return null;
    }

    return (
      <View style={styles.metaRow} key={label}>
        <Text style={styles.metaLabel}>{label}:</Text>
        <Text style={styles.metaValue}>{String(value)}</Text>
      </View>
    );
  };

  return (
    <ScrollView style={styles.container}>
      <View style={styles.content}>
        <Text style={styles.title}>Device Information</Text>
        <Text style={styles.description}>
          Live performance metrics and device metadata automatically collected
          by Faro SDK for better debugging and analytics.
        </Text>

        {/* Live Performance Metrics */}
        <PerformanceMetricsCard
          title="⚡ Live Performance"
          subtitle="Updates every 2 seconds"
        />

        {/* System Information */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>📱 System Information</Text>
          {renderMetaField('OS Name', browserMeta.name)}
          {renderMetaField('OS Version', browserMeta.os)}
          {renderMetaField('App Version', browserMeta.version)}
          {renderMetaField('Device Type', browserMeta.deviceType)}
          {renderMetaField('Is Mobile', browserMeta.mobile)}
          {renderMetaField('Is Emulator', browserMeta.isEmulator)}
          {renderMetaField('User Agent', browserMeta.userAgent)}
        </View>

        {/* Device Details */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>🔧 Device Details</Text>
          {renderMetaField('Brand & Model', browserMeta.brands)}
          {renderMetaField(
            'Viewport',
            `${browserMeta.viewportWidth}x${browserMeta.viewportHeight}`,
          )}
        </View>

        {/* Locale & Language */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>🌍 Locale & Language</Text>
          {renderMetaField('Primary Language', browserMeta.language)}
          {renderMetaField('Primary Locale', browserMeta.locale)}
          {renderMetaField('All Locales', browserMeta.locales)}
          {renderMetaField('Timezone', browserMeta.timezone)}
        </View>

        {/* Instructions */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>💡 Usage in Grafana Cloud</Text>
          <Text style={styles.instructions}>
            All this metadata is automatically attached to every log, error, and
            event sent to Grafana Cloud.
            {'\n\n'}
            Query examples:
            {'\n\n'}
            {`{service_name="React Native Test", browser_deviceType="mobile"}`}
            {'\n'}
            {`{service_name="React Native Test", browser_locale=~"en.*"}`}
            {'\n'}
            {`{service_name="React Native Test", browser_isEmulator="true"}`}
            {'\n\n'}
            Performance metrics (CPU and memory) are updated every 2 seconds.
          </Text>
        </View>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  content: {
    padding: 20,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 10,
    color: '#333',
  },
  description: {
    fontSize: 14,
    color: '#666',
    marginBottom: 20,
    lineHeight: 20,
  },
  section: {
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
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 15,
    color: '#333',
  },
  metaRow: {
    flexDirection: 'row',
    marginBottom: 8,
  },
  metaLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#666',
    width: 140,
  },
  metaValue: {
    fontSize: 14,
    color: '#333',
    flex: 1,
    flexWrap: 'wrap',
  },
  error: {
    fontSize: 14,
    color: '#ff6b6b',
    fontStyle: 'italic',
  },
  loading: {
    fontSize: 14,
    color: '#999',
    fontStyle: 'italic',
  },
  buttonContainer: {
    marginBottom: 20,
  },
  instructions: {
    fontSize: 12,
    color: '#666',
    lineHeight: 18,
    fontFamily: 'monospace',
  },
});
