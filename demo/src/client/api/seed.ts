import type { SeedGetSuccessPayload } from '../../common';
import { createApi } from '../utils';

import { baseQuery } from './baseQuery';

export const seedAPI = createApi({
  reducerPath: 'seedApi',
  baseQuery,
  tagTypes: ['Seed'],
  endpoints: (builder) => ({
    getSeed: builder.query<SeedGetSuccessPayload, void>({
      providesTags: ['Seed'],
      query: () => ({
        url: '/seed',
        method: 'GET',
      }),
    }),
  }),
});

export const { useLazyGetSeedQuery } = seedAPI;
