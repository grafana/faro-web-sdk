import type { NavigationState, PartialState, Route } from '@react-navigation/native';

import { initializeFaro } from '@grafana/faro-core';
import { mockConfig } from '@grafana/faro-core/src/testUtils';

import { getCurrentPage } from '../metas/page';
import { getCurrentScreen } from '../metas/screen';

import {
  createNavigationStateChangeHandler,
  getCurrentRoute,
  getRouteName,
  onNavigationStateChange,
} from './utils';

describe('navigation utils', () => {
  let faro: ReturnType<typeof initializeFaro>;

  beforeEach(() => {
    const config = mockConfig({});
    faro = initializeFaro(config);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('getCurrentRoute', () => {
    it('returns undefined for undefined state', () => {
      const route = getCurrentRoute(undefined);
      expect(route).toBeUndefined();
    });

    it('returns undefined for state without routes', () => {
      const state = { routes: [] } as any;
      const route = getCurrentRoute(state);
      expect(route).toBeUndefined();
    });

    it('returns the current route from simple state', () => {
      const mockRoute = { name: 'Home', key: 'home-1' };
      const state: NavigationState = {
        index: 0,
        routes: [mockRoute],
        stale: false,
        type: 'test',
        key: 'root',
      };

      const route = getCurrentRoute(state);
      expect(route).toEqual(mockRoute);
    });

    it('returns the active route when multiple routes exist', () => {
      const routes = [
        { name: 'Home', key: 'home-1' },
        { name: 'Profile', key: 'profile-1' },
        { name: 'Settings', key: 'settings-1' },
      ];

      const state: NavigationState = {
        index: 1, // Profile is active
        routes,
        stale: false,
        type: 'test',
        key: 'root',
      };

      const route = getCurrentRoute(state);
      expect(route).toEqual(routes[1]);
    });

    it('recursively gets nested route', () => {
      const nestedRoute = { name: 'NestedScreen', key: 'nested-1' };
      const routes = [
        {
          name: 'Tab',
          key: 'tab-1',
          state: {
            index: 0,
            routes: [nestedRoute],
            stale: false,
            type: 'stack',
            key: 'stack-1',
          },
        },
      ];

      const state: NavigationState = {
        index: 0,
        routes: routes as any,
        stale: false,
        type: 'test',
        key: 'root',
      };

      const route = getCurrentRoute(state);
      expect(route).toEqual(nestedRoute);
    });

    it('handles deeply nested navigation', () => {
      const deeplyNestedRoute = { name: 'DeepScreen', key: 'deep-1' };
      const routes = [
        {
          name: 'Tab1',
          key: 'tab1',
          state: {
            index: 0,
            routes: [
              {
                name: 'Stack1',
                key: 'stack1',
                state: {
                  index: 0,
                  routes: [deeplyNestedRoute],
                  stale: false,
                  type: 'stack',
                  key: 'stack-inner',
                },
              },
            ],
            stale: false,
            type: 'stack',
            key: 'stack-middle',
          },
        },
      ];

      const state: NavigationState = {
        index: 0,
        routes: routes as any,
        stale: false,
        type: 'test',
        key: 'root',
      };

      const route = getCurrentRoute(state);
      expect(route).toEqual(deeplyNestedRoute);
    });

    it('uses index 0 when index is not provided', () => {
      const routes = [
        { name: 'First', key: 'first-1' },
        { name: 'Second', key: 'second-1' },
      ];

      const state = {
        routes,
      } as PartialState<NavigationState>;

      const route = getCurrentRoute(state);
      expect(route).toEqual(routes[0]);
    });
  });

  describe('getRouteName', () => {
    it('returns route name from route object', () => {
      const route: Route<string> = { name: 'HomeScreen', key: 'home-1' };
      const name = getRouteName(route);
      expect(name).toBe('HomeScreen');
    });

    it('returns undefined for undefined route', () => {
      const name = getRouteName(undefined);
      expect(name).toBeUndefined();
    });

    it('extracts name from complex route object', () => {
      const route = {
        name: 'ProfileScreen',
        key: 'profile-1',
        params: { userId: '123' },
      } as Route<string>;

      const name = getRouteName(route);
      expect(name).toBe('ProfileScreen');
    });
  });

  describe('onNavigationStateChange', () => {
    it('does nothing when state is undefined', () => {
      const setViewSpy = jest.spyOn(faro.api, 'setView');
      const pushEventSpy = jest.spyOn(faro.api, 'pushEvent');

      onNavigationStateChange(undefined);

      expect(setViewSpy).not.toHaveBeenCalled();
      expect(pushEventSpy).not.toHaveBeenCalled();
    });

    it('updates screen and page when navigation changes', () => {
      const state: NavigationState = {
        index: 0,
        routes: [{ name: 'HomeScreen', key: 'home-1' }],
        stale: false,
        type: 'test',
        key: 'root',
      };

      onNavigationStateChange(state);

      const screen = getCurrentScreen();
      const page = getCurrentPage();

      expect(screen).toBe('HomeScreen');
      expect(page?.id).toBe('HomeScreen');
    });

    it('calls setView with screen name', () => {
      const setViewSpy = jest.spyOn(faro.api, 'setView');

      const state: NavigationState = {
        index: 0,
        routes: [{ name: 'ProfileScreen', key: 'profile-1' }],
        stale: false,
        type: 'test',
        key: 'root',
      };

      onNavigationStateChange(state);

      expect(setViewSpy).toHaveBeenCalledWith({ name: 'ProfileScreen' });
    });

    it('pushes navigation event when route has params', () => {
      const pushEventSpy = jest.spyOn(faro.api, 'pushEvent');

      const state: NavigationState = {
        index: 0,
        routes: [
          {
            name: 'DetailScreen',
            key: 'detail-1',
            params: { id: '123', category: 'electronics' },
          } as any,
        ],
        stale: false,
        type: 'test',
        key: 'root',
      };

      onNavigationStateChange(state);

      expect(pushEventSpy).toHaveBeenCalledWith('navigation', {
        screen: 'DetailScreen',
        params: JSON.stringify({ id: '123', category: 'electronics' }),
      });
    });

    it('does not push navigation event when route has no params', () => {
      const pushEventSpy = jest.spyOn(faro.api, 'pushEvent');

      const state: NavigationState = {
        index: 0,
        routes: [{ name: 'HomeScreen', key: 'home-1' }],
        stale: false,
        type: 'test',
        key: 'root',
      };

      onNavigationStateChange(state);

      expect(pushEventSpy).not.toHaveBeenCalled();
    });

    it('handles nested navigation state', () => {
      const setViewSpy = jest.spyOn(faro.api, 'setView');

      const state: NavigationState = {
        index: 0,
        routes: [
          {
            name: 'Tab',
            key: 'tab-1',
            state: {
              index: 0,
              routes: [{ name: 'NestedScreen', key: 'nested-1' }],
              stale: false,
              type: 'stack',
              key: 'stack-1',
            },
          } as any,
        ],
        stale: false,
        type: 'test',
        key: 'root',
      };

      onNavigationStateChange(state);

      expect(setViewSpy).toHaveBeenCalledWith({ name: 'NestedScreen' });
    });

    it('handles empty params object', () => {
      const pushEventSpy = jest.spyOn(faro.api, 'pushEvent');

      const state: NavigationState = {
        index: 0,
        routes: [
          {
            name: 'Screen',
            key: 'screen-1',
            params: {},
          } as any,
        ],
        stale: false,
        type: 'test',
        key: 'root',
      };

      onNavigationStateChange(state);

      expect(pushEventSpy).toHaveBeenCalledWith('navigation', {
        screen: 'Screen',
        params: '{}',
      });
    });

    it('stringifies complex params correctly', () => {
      const pushEventSpy = jest.spyOn(faro.api, 'pushEvent');

      const state: NavigationState = {
        index: 0,
        routes: [
          {
            name: 'Screen',
            key: 'screen-1',
            params: {
              nested: { value: 123 },
              array: [1, 2, 3],
              bool: true,
            },
          } as any,
        ],
        stale: false,
        type: 'test',
        key: 'root',
      };

      onNavigationStateChange(state);

      expect(pushEventSpy).toHaveBeenCalledWith('navigation', {
        screen: 'Screen',
        params: JSON.stringify({
          nested: { value: 123 },
          array: [1, 2, 3],
          bool: true,
        }),
      });
    });
  });

  describe('createNavigationStateChangeHandler', () => {
    it('returns a function', () => {
      const handler = createNavigationStateChangeHandler();
      expect(typeof handler).toBe('function');
    });

    it('returned function behaves like onNavigationStateChange', () => {
      const handler = createNavigationStateChangeHandler();
      const setViewSpy = jest.spyOn(faro.api, 'setView');

      const state: NavigationState = {
        index: 0,
        routes: [{ name: 'TestScreen', key: 'test-1' }],
        stale: false,
        type: 'test',
        key: 'root',
      };

      handler(state);

      expect(setViewSpy).toHaveBeenCalledWith({ name: 'TestScreen' });
    });

    it('can be called multiple times', () => {
      const handler = createNavigationStateChangeHandler();
      const setViewSpy = jest.spyOn(faro.api, 'setView');

      const state1: NavigationState = {
        index: 0,
        routes: [{ name: 'Screen1', key: 'screen1-1' }],
        stale: false,
        type: 'test',
        key: 'root',
      };

      const state2: NavigationState = {
        index: 0,
        routes: [{ name: 'Screen2', key: 'screen2-1' }],
        stale: false,
        type: 'test',
        key: 'root',
      };

      handler(state1);
      handler(state2);

      expect(setViewSpy).toHaveBeenCalledTimes(2);
      expect(setViewSpy).toHaveBeenNthCalledWith(1, { name: 'Screen1' });
      expect(setViewSpy).toHaveBeenNthCalledWith(2, { name: 'Screen2' });
    });

    it('handles undefined state', () => {
      const handler = createNavigationStateChangeHandler();
      const setViewSpy = jest.spyOn(faro.api, 'setView');

      handler(undefined);

      expect(setViewSpy).not.toHaveBeenCalled();
    });
  });
});
