import type { ArticleInputModel, ArticleModel, ArticlePublicModel, UserModel } from '../../../common';
import { Article } from '../repositories';

import { getCommentsByArticleId, getCommentsPublicFromComments } from './comments';
import { getUserById, getUserPublicFromUser } from './users';

export async function getArticlePublicFromArticle({ userId, ...article }: ArticleModel): Promise<ArticlePublicModel> {
  const commentsRaw = await getCommentsByArticleId(article.id);
  const comments = await getCommentsPublicFromComments(commentsRaw);

  const rawUser = (await getUserById(userId))!;
  const user = await getUserPublicFromUser(rawUser);

  return {
    ...article,
    comments,
    user,
  };
}

export async function getArticlesPublicFromArticles(articlesRaw: ArticleModel[]): Promise<ArticlePublicModel[]> {
  const articles: ArticlePublicModel[] = [];

  for (let idx = 0; idx < articlesRaw.length; idx++) {
    articles.push(await getArticlePublicFromArticle(articlesRaw[idx]!));
  }

  return articles;
}

export async function addArticle(articleInput: ArticleInputModel, userId: UserModel['id']): Promise<ArticleModel> {
  const model = await Article.create({
    ...articleInput,
    userId,
  });

  return model.toJSON()!;
}

export async function getArticleById(articleId: ArticleModel['id']): Promise<ArticleModel | undefined> {
  const model = await Article.findByPk(articleId);

  return model?.toJSON() ?? undefined;
}

export async function getArticlesByPage(page: number): Promise<ArticleModel[]> {
  const models = await Article.findAll({
    offset: page * 10,
    limit: 10,
  });

  return models.map((model) => model.toJSON());
}

export async function getArticlesLength(): Promise<number> {
  return await Article.count();
}
