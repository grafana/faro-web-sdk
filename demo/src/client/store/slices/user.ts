import { createSlice } from '@reduxjs/toolkit';
import type { PayloadAction } from '@reduxjs/toolkit';

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
    });

    builder.addMatcher(authAPI.endpoints.postRegister.matchFulfilled, (state, action) => {
      state.data = action.payload;
    });
  },
});

export const { setUser } = userSlice.actions;

export const selectUserData = (state: RootState) => state.user.data;
export const selectIsUserLoggedIn = (state: RootState) => state.user.data !== null;
