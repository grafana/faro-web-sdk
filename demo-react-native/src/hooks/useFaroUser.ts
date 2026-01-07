import { useEffect, useState } from 'react';

import { faro } from '@grafana/faro-react-native';

import type { DemoUser } from '../utils/randomUser';

/**
 * Hook to synchronize with Faro's current user
 *
 * This hook polls Faro's meta store every 500ms to detect user changes
 * and keeps the local state in sync. This allows multiple screens to
 * share the same user state through Faro as the single source of truth.
 *
 * @param pollInterval - How often to check for user changes (default: 500ms)
 * @returns The current user from Faro, or null if not set
 *
 * @example
 * ```tsx
 * function MyScreen() {
 *   const currentUser = useFaroUser();
 *
 *   return (
 *     <Text>Current user: {currentUser?.username}</Text>
 *   );
 * }
 * ```
 */
export function useFaroUser(pollInterval = 500): DemoUser | null {
  const [currentUser, setCurrentUser] = useState<DemoUser | null>(null);

  useEffect(() => {
    const updateUser = () => {
      if (faro?.metas?.value?.user) {
        const faroUser = faro.metas.value.user;

        // Create DemoUser from Faro user
        const user: DemoUser = {
          id: faroUser.id || '',
          email: faroUser.email || '',
          username: faroUser.username || '',
          attributes: {
            role: (faroUser.attributes?.role as string) || 'user',
            plan: (faroUser.attributes?.plan as string) || 'free',
          },
        };

        // Only update if user has changed to avoid unnecessary re-renders
        setCurrentUser(prev => {
          if (prev?.id !== user.id) {
            return user;
          }
          return prev;
        });
      } else {
        setCurrentUser(prev => {
          if (prev !== null) {
            return null;
          }
          return prev;
        });
      }
    };

    // Initial update
    updateUser();

    // Poll for user changes
    const interval = setInterval(updateUser, pollInterval);

    return () => clearInterval(interval);
  }, [pollInterval]);

  return currentUser;
}
