import type { ArticleModel } from './article';
import type { UserModel, UserPublicModel } from './user';

export type CommentModel = {
  articleId: ArticleModel['id'];
  date: number;
  id: string;
  text: string;
  userId: UserModel['id'];
};

export type CommentInputModel = {
  text: string;
};

export type CommentPublicModel = {
  date: number;
  id: string;
  text: string;
  user: UserPublicModel;
};
