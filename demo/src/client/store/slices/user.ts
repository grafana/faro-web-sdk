// import { createSlice } from '@reduxjs/toolkit';
import * as toolkitRaw from '@reduxjs/toolkit';
const { createSlice } = ((toolkitRaw as any).default ?? toolkitRaw) as typeof toolkitRaw;
import type { PayloadAction } from '@reduxjs/toolkit';

import { agent } from '@grafana/agent-integration-react';

import type { UserPublic } from '../../../common';
import { authAPI } from '../../api';
import type { RootState } from '../store';

export type UserState = {
  data: UserPublic | null;
};

export const initialState: UserState = {
  data: null,
};

export const userSlice = createSlice({
  name: 'user',
  initialState,
  reducers: {
    setUser: (state, action: PayloadAction<UserPublic | null>) => {
      state.data = action.payload;
    },
  },
  extraReducers: (builder) => {
    builder.addMatcher(authAPI.endpoints.postLogin.matchFulfilled, (state, action) => {
      state.data = action.payload;

      agent.api.setUser({
        email: action.payload.email,
        id: action.payload.id,
        username: action.payload.email,
      });
    });

    builder.addMatcher(authAPI.endpoints.postRegister.matchFulfilled, (state, action) => {
      state.data = action.payload;

      agent.api.setUser({
        email: action.payload.email,
        id: action.payload.id,
        username: action.payload.email,
      });
    });

    builder.addMatcher(authAPI.endpoints.getAuthState.matchFulfilled, (state, action) => {
      state.data = action.payload;

      agent.api.setUser({
        email: action.payload.email,
        id: action.payload.id,
        username: action.payload.email,
      });
    });

    builder.addMatcher(authAPI.endpoints.getLogout.matchFulfilled, (state) => {
      state.data = null;

      agent.api.setUser({
        email: undefined,
        id: undefined,
        username: undefined,
      });
    });
  },
});

export const { setUser } = userSlice.actions;

export const selectUserData = (state: RootState) => state.user.data;
export const selectIsUserLoggedIn = (state: RootState) => state.user.data !== null;
