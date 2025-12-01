import React from 'react';
import {NavigationContainer} from '@react-navigation/native';
import {createNativeStackNavigator} from '@react-navigation/native-stack';
import {HomeScreen} from '../screens/HomeScreen';
import {ErrorDemoScreen} from '../screens/ErrorDemoScreen';
import {ErrorBoundaryDemoScreen} from '../screens/ErrorBoundaryDemoScreen';
import {PerformanceDemoScreen} from '../screens/PerformanceDemoScreen';
import {AboutScreen} from '../screens/AboutScreen';

export type RootStackParamList = {
  Home: undefined;
  ErrorDemo: undefined;
  ErrorBoundaryDemo: undefined;
  PerformanceDemo: undefined;
  About: undefined;
};

const Stack = createNativeStackNavigator<RootStackParamList>();

export function AppNavigator() {
  return (
    <NavigationContainer>
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
        }}>
        <Stack.Screen
          name="Home"
          component={HomeScreen}
          options={{title: 'Faro RN Demo'}}
        />
        <Stack.Screen
          name="ErrorDemo"
          component={ErrorDemoScreen}
          options={{title: 'Error Demo'}}
        />
        <Stack.Screen
          name="ErrorBoundaryDemo"
          component={ErrorBoundaryDemoScreen}
          options={{title: 'Error Boundary Demo'}}
        />
        <Stack.Screen
          name="PerformanceDemo"
          component={PerformanceDemoScreen}
          options={{title: 'Performance Demo'}}
        />
        <Stack.Screen
          name="About"
          component={AboutScreen}
          options={{title: 'About'}}
        />
      </Stack.Navigator>
    </NavigationContainer>
  );
}
