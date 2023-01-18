import type {
  ArticleAddPayload,
  ArticleAddSuccessPayload,
  ArticleCommentAddPayload,
  ArticleCommentAddSuccessPayload,
  ArticleGetPayload,
  ArticleGetSuccessPayload,
  ArticlesGetPayload,
  ArticlesGetSuccessPayload,
} from '../../common';
import { createApi } from '../utils';

import { baseQuery } from './baseQuery';

export const articlesAPI = createApi({
  reducerPath: 'articlesApi',
  baseQuery,
  tagTypes: ['Article', 'Articles', 'ArticleComment'],
  endpoints: (builder) => ({
    getArticles: builder.query<ArticlesGetSuccessPayload, ArticlesGetPayload>({
      providesTags: ['Article', 'Articles', 'ArticleComment'],
      query: (params) => ({
        url: '/articles',
        method: 'GET',
        params,
      }),
    }),
    getArticle: builder.query<ArticleGetSuccessPayload, ArticleGetPayload>({
      providesTags: ['Article', 'ArticleComment'],
      query: (params) => ({
        url: `/articles/${params.id}`,
        method: 'GET',
      }),
    }),
    postArticle: builder.mutation<ArticleAddSuccessPayload, ArticleAddPayload>({
      invalidatesTags: ['Article', 'Articles', 'ArticleComment'],
      query: (body) => ({
        url: `/articles`,
        method: 'POST',
        body,
      }),
    }),
    postArticleComment: builder.mutation<
      ArticleCommentAddSuccessPayload,
      ArticleCommentAddPayload & { articleId: string }
    >({
      invalidatesTags: ['Article', 'ArticleComment'],
      query: ({ articleId, ...body }) => ({
        url: `/articles/${articleId}/comment`,
        method: 'POST',
        body,
      }),
    }),
  }),
});

export const { useGetArticleQuery, useGetArticlesQuery, usePostArticleMutation, usePostArticleCommentMutation } =
  articlesAPI;
