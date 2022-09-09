import type { ArticleInput, ArticlePublic, CommentInput, CommentPublic } from '../data';
import type { ErrorResponse } from './generic';

export type ArticleGetPayload = {
  id: string;
};

export type ArticleGetSuccessPayload = ArticlePublic;

export type ArticleGetErrorPayload = ErrorResponse;

export type ArticlesGetPayload = {
  page: string;
};

export type ArticlesGetSuccessPayload = {
  items: ArticlePublic[];
  totalSize: number;
};

export type ArticlesGetErrorPayload = ErrorResponse;

export type ArticleAddPayload = ArticleInput;

export type ArticleAddSuccessPayload = ArticlePublic;

export type ArticleAddErrorPayload = ErrorResponse;

export type ArticleCommentAddPayload = CommentInput;

export type ArticleCommentAddSuccessPayload = CommentPublic;

export type ArticleCommentAddErrorPayload = ErrorResponse;
