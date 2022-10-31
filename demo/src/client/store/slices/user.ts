import type { PayloadAction } from '@reduxjs/toolkit';

import { faro } from '@grafana/faro-react';

import type { UserPublicModel } from '../../../common';
import { authAPI } from '../../api';
import { createSlice } from '../../utils';
import type { RootState } from '../store';

export type UserState = {
  data: UserPublicModel | null;
};

export const initialState: UserState = {
  data: null,
};

export const userSlice = createSlice({
  name: 'user',
  initialState,
  reducers: {
    setUser: (state, action: PayloadAction<UserPublicModel | null>) => {
      state.data = action.payload;
    },
  },
  extraReducers: (builder) => {
    builder.addMatcher(authAPI.endpoints.postLogin.matchFulfilled, (state, action) => {
      state.data = action.payload.data;

      faro.api.setUser({
        email: action.payload.data.email,
        id: action.payload.data.id,
        username: action.payload.data.email,
      });
    });

    builder.addMatcher(authAPI.endpoints.postRegister.matchFulfilled, (state, action) => {
      state.data = action.payload.data;

      faro.api.setUser({
        email: action.payload.data.email,
        id: action.payload.data.id,
        username: action.payload.data.email,
      });
    });

    builder.addMatcher(authAPI.endpoints.getAuthState.matchFulfilled, (state, action) => {
      state.data = action.payload.data;

      faro.api.setUser({
        email: action.payload.data.email,
        id: action.payload.data.id,
        username: action.payload.data.email,
      });
    });

    builder.addMatcher(authAPI.endpoints.getLogout.matchFulfilled, (state) => {
      state.data = null;

      faro.api.setUser({
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
