import type { NavigationContainerRef, NavigationState } from '@react-navigation/native';
// Import React dynamically to use the same instance as the consuming app
import * as React from 'react';

import { onNavigationStateChange } from './utils';

/**
 * Hook to integrate Faro with React Navigation
 *
 * This hook automatically tracks navigation changes and updates Faro's view meta.
 * It works with both NavigationContainer refs and the useNavigationContainerRef hook.
 *
 * @param navigationRef - Reference to the NavigationContainer
 *
 * @example
 * ```
 * import { useNavigationContainerRef } from '@react-navigation/native';
 * import { useFaroNavigation } from '@grafana/faro-react-native';
 *
 * function App() {
 *   const navigationRef = useNavigationContainerRef();
 *   useFaroNavigation(navigationRef);
 *
 *   return (
 *     <NavigationContainer ref={navigationRef}>
 *       // your navigation
 *     </NavigationContainer>
 *   );
 * }
 * ```
 */
export function useFaroNavigation(navigationRef: React.RefObject<NavigationContainerRef<any>>): void {
  const unsubscribeRef = React.useRef<(() => void) | null>(null);

  React.useEffect(() => {
    if (!navigationRef.current) {
      return;
    }

    // Get initial state and track it
    const initialState = navigationRef.current.getRootState();
    if (initialState) {
      onNavigationStateChange(initialState);
    }

    // Subscribe to navigation state changes
    unsubscribeRef.current = navigationRef.current.addListener('state', (e) => {
      onNavigationStateChange(e.data.state as NavigationState);
    });

    // Cleanup subscription on unmount
    return () => {
      if (unsubscribeRef.current) {
        unsubscribeRef.current();
        unsubscribeRef.current = null;
      }
    };
  }, [navigationRef]);
}
