import { createApi } from '@reduxjs/toolkit/query/react';

import type {
  ArticleCommentAddPayload,
  ArticleCommentAddSuccessPayload,
  ArticleGetPayload,
  ArticleGetSuccessPayload,
  ArticlesGetPayload,
  ArticlesGetSuccessPayload,
} from '../../common';
import { baseQuery } from './baseQuery';

export const articlesAPI = createApi({
  reducerPath: 'articlesApi',
  baseQuery,
  tagTypes: ['Articles'],
  endpoints: (builder) => ({
    getArticles: builder.query<ArticlesGetSuccessPayload, ArticlesGetPayload>({
      query: (params) => ({
        url: '/articles',
        method: 'GET',
        params,
      }),
    }),
    getArticle: builder.query<ArticleGetSuccessPayload, ArticleGetPayload>({
      query: (params) => ({
        url: `/articles/${params.id}`,
        method: 'GET',
      }),
    }),
    postArticleComment: builder.mutation<ArticleCommentAddSuccessPayload, ArticleCommentAddPayload>({
      query: (body) => ({
        url: '/auth/logout',
        method: 'POST',
        body,
      }),
    }),
  }),
});

export const { useLazyGetArticleQuery, useGetArticlesQuery, usePostArticleCommentMutation } = articlesAPI;
