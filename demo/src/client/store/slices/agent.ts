import type { PayloadAction } from '@reduxjs/toolkit';

import type { MetaSession } from '@grafana/agent-integration-react';

import { createSlice } from '../../utils';
import type { RootState } from '../store';

export type AgentState = {
  rootSpanId: string | null;
  rootTraceId: string | null;
  session: MetaSession | null;
};

export const initialState: AgentState = {
  rootSpanId: null,
  rootTraceId: null,
  session: null,
};

export const agentSlice = createSlice({
  name: 'agent',
  initialState,
  reducers: {
    setSession: (state, action: PayloadAction<MetaSession>) => {
      state.session = action.payload;
    },
  },
});

export const { setSession } = agentSlice.actions;

export const selectSession = (state: RootState) => state.agent.session;
export const selectRootSpanId = (state: RootState) => state.agent.rootSpanId;
export const selectRootTraceId = (state: RootState) => state.agent.rootTraceId;
