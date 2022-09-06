import type { CommentPublic } from './comment';
import type { User, UserPublic } from './user';

export type Article = {
  date: number;
  id: string;
  name: string;
  text: string;
  userId: User['id'];
};

export type ArticleInput = {
  name: string;
  text: string;
};

export type ArticlePublic = {
  comments: CommentPublic[];
  date: number;
  id: string;
  name: string;
  text: string;
  user: UserPublic;
};
