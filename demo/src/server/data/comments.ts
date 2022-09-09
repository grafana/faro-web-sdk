import { v4 as uuidv4 } from 'uuid';

import type { Article, Comment, CommentInput, CommentPublic, User } from '../../common';
import { getUserById, getUserPublicFromUser } from './users';

export let comments: Comment[] = [];

export function getCommentPublicFromComment(comment: Comment): CommentPublic {
  return {
    date: comment.date,
    id: comment.id,
    text: comment.text,
    user: getUserPublicFromUser(getUserById(comment.userId) as User),
  };
}

export function addComment(commentInput: CommentInput, articleId: Article['id'], userId: User['id']): Comment {
  const id = uuidv4();

  comments.push({
    articleId,
    date: Date.now(),
    id,
    text: commentInput.text,
    userId,
  });

  return getCommentById(id)!;
}

export function getCommentById(commentId: Comment['id']): Comment | undefined {
  return comments.find((comment) => comment.id === commentId);
}

export function getCommentsByArticleId(articleId: Article['id']): Comment[] {
  return comments.filter((comment) => comment.articleId === articleId);
}
