import type { Article } from './article';
import type { User, UserPublic } from './user';

export type Comment = {
  articleId: Article['id'];
  date: number;
  id: string;
  text: string;
  userId: User['id'];
};

export type CommentInput = {
  text: string;
};

export type CommentPublic = {
  date: number;
  id: string;
  text: string;
  user: UserPublic;
};
