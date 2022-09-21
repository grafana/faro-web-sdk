import { combineReducers } from 'redux';

import { apiMiddleware, apiReducers } from '../api';
import { configureStore, setupListeners } from '../utils';
import { userSlice } from './slices/user';

export function createStore(preloadedState: {}) {
  const store = configureStore({
    preloadedState,
    reducer: combineReducers({
      user: userSlice.reducer,
      ...apiReducers,
    }),
    middleware: (getDefaultMiddleware) =>
      getDefaultMiddleware({
        serializableCheck: false,
      }).concat(apiMiddleware),
  });

  setupListeners(store.dispatch);

  return store;
}

export type RootState = ReturnType<ReturnType<typeof createStore>['getState']>;

export type AppDispatch = ReturnType<typeof createStore>['dispatch'];
