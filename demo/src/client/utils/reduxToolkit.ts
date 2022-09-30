import * as toolkitRaw from '@reduxjs/toolkit';
import * as toolkitQueryReact from '@reduxjs/toolkit/query/react';

// RTK Query has some issues during build process
// This is the easiest way to avoid them

export const { configureStore, createSlice } = ((toolkitRaw as any).default ?? toolkitRaw) as typeof toolkitRaw;

export const { createApi, fetchBaseQuery, setupListeners } = ((toolkitQueryReact as any).default ??
  toolkitQueryReact) as typeof toolkitQueryReact;
