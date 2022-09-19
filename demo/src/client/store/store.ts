// import { configureStore } from '@reduxjs/toolkit';
import * as toolkitRaw from '@reduxjs/toolkit';
const { configureStore } = ((toolkitRaw as any).default ?? toolkitRaw) as typeof toolkitRaw;
// import { setupListeners } from '@reduxjs/toolkit/query';
import * as toolkitQueryReact from '@reduxjs/toolkit/query/react';
const { setupListeners } = ((toolkitQueryReact as any).default ?? toolkitQueryReact) as typeof toolkitQueryReact;
import { combineReducers } from 'redux';

import { apiMiddleware, apiReducers } from '../api';
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
