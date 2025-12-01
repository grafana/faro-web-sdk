/**
 * Faro React Native Demo App
 * Demonstrates the Grafana Faro React Native SDK
 */

import React from 'react';
import {StatusBar, useColorScheme} from 'react-native';
import {SafeAreaProvider} from 'react-native-safe-area-context';
import {AppNavigator} from './src/navigation/AppNavigator';
// import {initFaro} from './src/faro/initialize';

function App() {
  const isDarkMode = useColorScheme() === 'dark';

  // TODO: Re-enable Faro initialization once basic app is working
  // useEffect(() => {
  //   try {
  //     initFaro();
  //   } catch (error) {
  //     console.error('Failed to initialize Faro:', error);
  //   }
  // }, []);

  return (
    <SafeAreaProvider>
      <StatusBar barStyle={isDarkMode ? 'light-content' : 'dark-content'} />
      <AppNavigator />
    </SafeAreaProvider>
  );
}

export default App;
