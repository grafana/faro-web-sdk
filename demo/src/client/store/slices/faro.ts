import type { PayloadAction } from '@reduxjs/toolkit';

import type { MetaSession } from '@grafana/faro-react';

import { createSlice } from '../../utils';
import type { RootState } from '../store';

export type FaroState = {
  rootSpanId: string | null;
  rootTraceId: string | null;
  session: MetaSession | null;
};

export const initialState: FaroState = {
  rootSpanId: null,
  rootTraceId: null,
  session: null,
};

export const faroSlice = createSlice({
  name: 'faro',
  initialState,
  reducers: {
    setSession: (state, action: PayloadAction<MetaSession>) => {
      state.session = action.payload;
    },
  },
});

export const { setSession } = faroSlice.actions;

export const selectSession = (state: RootState) => state.faro.session;
export const selectRootSpanId = (state: RootState) => state.faro.rootSpanId;
export const selectRootTraceId = (state: RootState) => state.faro.rootTraceId;
