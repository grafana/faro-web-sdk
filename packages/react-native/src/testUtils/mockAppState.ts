import { type AppStateStatus } from 'react-native';

/**
 * Mock AppState for testing
 */
export function mockAppState(): {
  setCurrentState: (state: AppStateStatus) => void;
  triggerChange: (state: AppStateStatus) => void;
} {
  let currentState: AppStateStatus = 'active';
  const listeners = new Set<(state: AppStateStatus) => void>();

  const mockAppState = {
    currentState: 'active',
    addEventListener: jest.fn((event: string, handler: (state: AppStateStatus) => void) => {
      if (event === 'change') {
        listeners.add(handler);
      }
      return {
        remove: jest.fn(() => {
          listeners.delete(handler);
        }),
      };
    }),
    removeEventListener: jest.fn((event: string, handler: (state: AppStateStatus) => void) => {
      if (event === 'change') {
        listeners.delete(handler);
      }
    }),
  };

  jest.mock('react-native/Libraries/AppState/AppState', () => mockAppState);

  return {
    setCurrentState: (state: AppStateStatus) => {
      currentState = state;
      mockAppState.currentState = state;
    },
    triggerChange: (state: AppStateStatus) => {
      currentState = state;
      mockAppState.currentState = state;
      listeners.forEach((listener) => listener(state));
    },
  };
}
