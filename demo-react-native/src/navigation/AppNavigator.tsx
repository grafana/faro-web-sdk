import React from 'react';
import {
  NavigationContainer,
  useNavigationContainerRef,
} from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { useFaroNavigation } from '@grafana/faro-react-native';
import { HomeScreen } from '../screens/HomeScreen';
import { ErrorDemoScreen } from '../screens/ErrorDemoScreen';
import { ErrorBoundaryDemoScreen } from '../screens/ErrorBoundaryDemoScreen';
import { PerformanceDemoScreen } from '../screens/PerformanceDemoScreen';
import { SlowLoadDemoScreen } from '../screens/SlowLoadDemoScreen';
import { AboutScreen } from '../screens/AboutScreen';
import ConsoleTestScreen from '../screens/ConsoleTestScreen';
import DeviceInfoScreen from '../screens/DeviceInfoScreen';
import TracingDemoScreen from '../screens/TracingDemoScreen';
import { ShowcaseScreen } from '../screens/ShowcaseScreen';

export type RootStackParamList = {
  Home: undefined;
  Showcase: undefined;
  ErrorDemo: undefined;
  ErrorBoundaryDemo: undefined;
  PerformanceDemo: undefined;
  SlowLoadDemo: undefined;
  About: undefined;
  ConsoleTest: undefined;
  DeviceInfo: undefined;
  TracingDemo: undefined;
};

const Stack = createNativeStackNavigator<RootStackParamList>();

export function AppNavigator() {
  // Create navigation ref for Faro tracking
  const navigationRef = useNavigationContainerRef<RootStackParamList>();

  // Automatically track navigation changes with Faro
  useFaroNavigation(navigationRef);

  return (
    <NavigationContainer ref={navigationRef}>
      <Stack.Navigator
        initialRouteName="Home"
        screenOptions={{
          headerStyle: {
            backgroundColor: '#FF5F00',
          },
          headerTintColor: '#fff',
          headerTitleStyle: {
            fontWeight: 'bold',
          },
        }}
      >
        <Stack.Screen
          name="Home"
          component={HomeScreen}
          options={{ title: 'Faro RN Demo' }}
        />
        <Stack.Screen
          name="Showcase"
          component={ShowcaseScreen}
          options={{ title: 'SDK Showcase' }}
        />
        <Stack.Screen
          name="ErrorDemo"
          component={ErrorDemoScreen}
          options={{ title: 'Error Demo' }}
        />
        <Stack.Screen
          name="ErrorBoundaryDemo"
          component={ErrorBoundaryDemoScreen}
          options={{ title: 'Error Boundary Demo' }}
        />
        <Stack.Screen
          name="PerformanceDemo"
          component={PerformanceDemoScreen}
          options={{ title: 'Performance Demo' }}
        />
        <Stack.Screen
          name="SlowLoadDemo"
          component={SlowLoadDemoScreen}
          options={{ title: 'Slow Load Demo' }}
        />
        <Stack.Screen
          name="About"
          component={AboutScreen}
          options={{ title: 'About' }}
        />
        <Stack.Screen
          name="ConsoleTest"
          component={ConsoleTestScreen}
          options={{ title: 'Console Tests' }}
        />
        <Stack.Screen
          name="DeviceInfo"
          component={DeviceInfoScreen}
          options={{ title: 'Device Info' }}
        />
        <Stack.Screen
          name="TracingDemo"
          component={TracingDemoScreen}
          options={{ title: 'Tracing Demo' }}
        />
      </Stack.Navigator>
    </NavigationContainer>
  );
}
