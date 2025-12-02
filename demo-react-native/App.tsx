/**
 * Faro React Native Demo App
 * Demonstrates the Grafana Faro React Native SDK
 */

import React, { useEffect } from 'react';
import { StatusBar, useColorScheme } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { AppNavigator } from './src/navigation/AppNavigator';
import { initFaro } from './src/faro/initialize';
import { markBundleLoaded } from '@grafana/faro-react-native';

// Mark bundle loaded after all imports
markBundleLoaded();

function App() {
  const isDarkMode = useColorScheme() === 'dark';

  useEffect(() => {
    try {
      initFaro();
    } catch (error) {
      console.error('Failed to initialize Faro:', error);
    }
  }, []);

  return (
    <SafeAreaProvider>
      <StatusBar barStyle={isDarkMode ? 'light-content' : 'dark-content'} />
      <AppNavigator />
    </SafeAreaProvider>
  );
}

export default App;
