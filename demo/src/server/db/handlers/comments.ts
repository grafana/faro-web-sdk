import type { ArticleModel, CommentInputModel, CommentModel, CommentPublicModel, UserModel } from '../../../common';
import { Comment } from '../repositories';

import { getUserById, getUserPublicFromUser } from './users';

export async function getCommentPublicFromComment({
  articleId: _articleId,
  userId,
  ...comment
}: CommentModel): Promise<CommentPublicModel> {
  const userRaw = (await getUserById(userId))!;
  const user = await getUserPublicFromUser(userRaw);

  return {
    ...comment,
    user,
  };
}

export async function getCommentsPublicFromComments(commentsRaw: CommentModel[]): Promise<CommentPublicModel[]> {
  const comments: CommentPublicModel[] = [];

  for (let idx = 0; idx < commentsRaw.length; idx++) {
    comments.push(await getCommentPublicFromComment(commentsRaw[idx]!));
  }

  return comments;
}

export async function addComment(
  commentInput: CommentInputModel,
  articleId: ArticleModel['id'],
  userId: UserModel['id']
): Promise<CommentModel> {
  const model = await Comment.create({
    ...commentInput,
    articleId,
    userId,
  });

  return model.toJSON();
}

export async function getCommentById(commentId: CommentModel['id']): Promise<CommentModel | undefined> {
  const model = await Comment.findByPk(commentId);

  return model?.toJSON() ?? undefined;
}

export async function getCommentsByArticleId(articleId: ArticleModel['id']): Promise<CommentModel[]> {
  const models = await Comment.findAll({
    where: {
      articleId,
    },
  });

  return models.map((model) => model.toJSON());
}
