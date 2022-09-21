import type { CommentPublicModel } from './comment';
import type { UserModel, UserPublicModel } from './user';

export type ArticleModel = {
  date: number;
  id: string;
  name: string;
  text: string;
  userId: UserModel['id'];
};

export type ArticleInputModel = {
  name: string;
  text: string;
};

export type ArticlePublicModel = {
  comments: CommentPublicModel[];
  date: number;
  id: string;
  name: string;
  text: string;
  user: UserPublicModel;
};
