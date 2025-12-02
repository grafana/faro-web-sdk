import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, Button, RefreshControl } from 'react-native';
import { getAsyncDeviceMeta } from '@grafana/faro-react-native';
import { faro } from '@grafana/faro-react-native';

/**
 * Device Info Screen
 * Displays all collected device metadata including async information
 */
export default function DeviceInfoScreen() {
  const [asyncDeviceInfo, setAsyncDeviceInfo] = useState<any>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Get synchronous device info from Faro's browser meta
  const browserMeta = (faro?.metas?.value?.browser as any) || {};

  const fetchAsyncDeviceInfo = async () => {
    try {
      setRefreshing(true);
      setError(null);
      const asyncInfo = await getAsyncDeviceMeta();
      setAsyncDeviceInfo(asyncInfo);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch async device info');
    } finally {
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchAsyncDeviceInfo();
  }, []);

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
    <ScrollView
      style={styles.container}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={fetchAsyncDeviceInfo} />}
    >
      <View style={styles.content}>
        <Text style={styles.title}>Device Information</Text>
        <Text style={styles.description}>
          All metadata automatically collected by Faro SDK for better debugging and analytics.
        </Text>

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
          {renderMetaField('Viewport', `${browserMeta.viewportWidth}x${browserMeta.viewportHeight}`)}
        </View>

        {/* Locale & Language */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>🌍 Locale & Language</Text>
          {renderMetaField('Primary Language', browserMeta.language)}
          {renderMetaField('Primary Locale', browserMeta.locale)}
          {renderMetaField('All Locales', browserMeta.locales)}
          {renderMetaField('Timezone', browserMeta.timezone)}
        </View>

        {/* Memory Information */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>💾 Memory</Text>
          {renderMetaField(
            'Total Memory',
            browserMeta.totalMemory
              ? `${(parseInt(browserMeta.totalMemory) / 1024 / 1024 / 1024).toFixed(2)} GB`
              : 'Unknown'
          )}
          {renderMetaField(
            'Used Memory',
            browserMeta.usedMemory
              ? `${(parseInt(browserMeta.usedMemory) / 1024 / 1024 / 1024).toFixed(2)} GB`
              : 'Unknown'
          )}
        </View>

        {/* Async Device Info */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>🔋 Battery & Network (Async)</Text>
          {error ? (
            <Text style={styles.error}>Error: {error}</Text>
          ) : asyncDeviceInfo ? (
            <>
              {renderMetaField('Battery Level', asyncDeviceInfo.batteryLevel)}
              {renderMetaField('Is Charging', asyncDeviceInfo.isCharging)}
              {renderMetaField('Low Power Mode', asyncDeviceInfo.lowPowerMode)}
              {renderMetaField('Carrier', asyncDeviceInfo.carrier)}
            </>
          ) : (
            <Text style={styles.loading}>Loading...</Text>
          )}
        </View>

        {/* Refresh Button */}
        <View style={styles.buttonContainer}>
          <Button
            title="Refresh Async Data"
            onPress={fetchAsyncDeviceInfo}
            disabled={refreshing}
          />
        </View>

        {/* Instructions */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>💡 Usage in Grafana Cloud</Text>
          <Text style={styles.instructions}>
            All this metadata is automatically attached to every log, error, and event sent to
            Grafana Cloud.
            {'\n\n'}
            Query examples:
            {'\n\n'}
            {`{service_name="React Native Test", browser_deviceType="mobile"}`}
            {'\n'}
            {`{service_name="React Native Test", browser_locale=~"en.*"}`}
            {'\n'}
            {`{service_name="React Native Test", browser_isEmulator="true"}`}
            {'\n\n'}
            Pull down to refresh battery and network info.
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
