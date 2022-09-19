import * as toolkitQueryReact from '@reduxjs/toolkit/query/react';
const { createApi } = ((toolkitQueryReact as any).default ?? toolkitQueryReact) as typeof toolkitQueryReact;
// import { createApi } from '@reduxjs/toolkit/query/react';

import type {
  AuthGetAuthStateSuccessPayload,
  AuthLoginPayload,
  AuthLoginSuccessPayload,
  AuthLogoutSuccessPayload,
  AuthRegisterPayload,
  AuthRegisterSuccessPayload,
} from '../../common';
import { baseQuery } from './baseQuery';

export const authAPI = createApi({
  reducerPath: 'authApi',
  baseQuery,
  tagTypes: ['Auth'],
  endpoints: (builder) => ({
    postRegister: builder.mutation<AuthRegisterSuccessPayload, AuthRegisterPayload>({
      query: (body) => ({
        url: '/auth/register',
        method: 'POST',
        body,
      }),
    }),
    postLogin: builder.mutation<AuthLoginSuccessPayload, AuthLoginPayload>({
      query: (body) => ({
        url: '/auth/login',
        method: 'POST',
        body,
      }),
    }),
    getLogout: builder.query<AuthLogoutSuccessPayload, void>({
      query: () => ({
        url: '/auth/logout',
        method: 'GET',
      }),
    }),
    getAuthState: builder.query<AuthGetAuthStateSuccessPayload, void>({
      query: () => ({
        url: '/auth/state',
        method: 'GET',
      }),
    }),
  }),
});

export const { useLazyGetAuthStateQuery, useLazyGetLogoutQuery, usePostLoginMutation, usePostRegisterMutation } =
  authAPI;
