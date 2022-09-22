import type { ArticleInputModel, ArticlePublicModel, CommentInputModel, CommentPublicModel } from '../models';
import type { ErrorResponse } from './generic';

export type ArticleGetPayload = {
  id: string;
};

export type ArticleGetSuccessPayload = ArticlePublicModel;

export type ArticleGetErrorPayload = ErrorResponse;

export type ArticlesGetPayload = {
  page: string;
};

export type ArticlesGetSuccessPayload = {
  items: ArticlePublicModel[];
  totalSize: number;
};

export type ArticlesGetErrorPayload = ErrorResponse;

export type ArticleAddPayload = ArticleInputModel;

export type ArticleAddSuccessPayload = ArticlePublicModel;

export type ArticleAddErrorPayload = ErrorResponse;

export type ArticleCommentAddPayload = CommentInputModel;

export type ArticleCommentAddSuccessPayload = CommentPublicModel;

export type ArticleCommentAddErrorPayload = ErrorResponse;
