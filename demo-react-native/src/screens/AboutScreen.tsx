import React from 'react';
import {View, Text, StyleSheet, ScrollView} from 'react-native';

export function AboutScreen() {
  return (
    <ScrollView contentContainerStyle={styles.container}>
      <Text style={styles.title}>About Faro React Native</Text>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>What is Faro?</Text>
        <Text style={styles.text}>
          Grafana Faro is a highly configurable open source real user monitoring
          (RUM) SDK for frontend applications. It collects telemetry data
          including logs, traces, metrics, errors, and events.
        </Text>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>React Native SDK</Text>
        <Text style={styles.text}>
          This demo showcases the React Native port of the Faro Web SDK. It
          provides platform-specific implementations for:
        </Text>
        <View style={styles.listItem}>
          <Text style={styles.bullet}>•</Text>
          <Text style={styles.text}>Error tracking and reporting</Text>
        </View>
        <View style={styles.listItem}>
          <Text style={styles.bullet}>•</Text>
          <Text style={styles.text}>Console log capture</Text>
        </View>
        <View style={styles.listItem}>
          <Text style={styles.bullet}>•</Text>
          <Text style={styles.text}>Navigation tracking</Text>
        </View>
        <View style={styles.listItem}>
          <Text style={styles.bullet}>•</Text>
          <Text style={styles.text}>Performance monitoring</Text>
        </View>
        <View style={styles.listItem}>
          <Text style={styles.bullet}>•</Text>
          <Text style={styles.text}>Session management</Text>
        </View>
        <View style={styles.listItem}>
          <Text style={styles.bullet}>•</Text>
          <Text style={styles.text}>App state tracking</Text>
        </View>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Demo Features</Text>
        <Text style={styles.text}>
          Explore the different screens to see how Faro captures various types
          of telemetry data in a React Native environment.
        </Text>
      </View>

      <View style={styles.footer}>
        <Text style={styles.footerText}>
          Grafana Faro React Native SDK{'\n'}
          Version 2.0.2
        </Text>
      </View>
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
    marginBottom: 24,
    color: '#333',
  },
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 8,
    color: '#FF5F00',
  },
  text: {
    fontSize: 14,
    color: '#666',
    lineHeight: 20,
  },
  listItem: {
    flexDirection: 'row',
    marginLeft: 8,
    marginTop: 4,
  },
  bullet: {
    fontSize: 14,
    color: '#FF5F00',
    marginRight: 8,
  },
  footer: {
    marginTop: 32,
    paddingTop: 24,
    borderTopWidth: 1,
    borderTopColor: '#dee2e6',
    alignItems: 'center',
  },
  footerText: {
    fontSize: 12,
    color: '#999',
    textAlign: 'center',
  },
});
