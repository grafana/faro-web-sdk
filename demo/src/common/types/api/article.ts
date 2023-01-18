import type { ArticleInputModel, ArticlePublicModel, CommentInputModel, CommentPublicModel } from '../models';

import type { ErrorResponse, SuccessResponse } from './generic';

export type ArticleGetPayload = {
  id: string;
};

export type ArticleGetSuccessPayload = SuccessResponse<ArticlePublicModel>;

export type ArticleGetErrorPayload = ErrorResponse;

export type ArticlesGetPayload = {
  page: string;
};

export type ArticlesGetSuccessPayload = SuccessResponse<{
  items: ArticlePublicModel[];
  totalSize: number;
}>;

export type ArticlesGetErrorPayload = ErrorResponse;

export type ArticleAddPayload = ArticleInputModel;

export type ArticleAddSuccessPayload = SuccessResponse<ArticlePublicModel>;

export type ArticleAddErrorPayload = ErrorResponse;

export type ArticleCommentAddPayload = CommentInputModel;

export type ArticleCommentAddSuccessPayload = SuccessResponse<CommentPublicModel>;

export type ArticleCommentAddErrorPayload = ErrorResponse;
