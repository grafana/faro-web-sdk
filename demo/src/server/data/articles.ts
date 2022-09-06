import { v4 as uuidv4 } from 'uuid';

import type { Article, ArticleInput, ArticlePublic, User } from '../../models';
import { getCommentPublicFromComment, getCommentsByArticleId } from './comments';
import { getUserById, getUserPublicFromUser } from './users';

export let articles: Article[] = [];

export function getArticlePublicFromArticle(article: Article): ArticlePublic {
  return {
    comments: getCommentsByArticleId(article.id).map(getCommentPublicFromComment),
    date: article.date,
    id: article.id,
    name: article.name,
    text: article.text,
    user: getUserPublicFromUser(getUserById(article.userId) as User),
  };
}

export function addArticle(articleInput: ArticleInput, userId: User['id']): Article {
  const id = uuidv4();

  articles.push({
    date: Date.now(),
    id,
    name: articleInput.name,
    text: articleInput.text,
    userId,
  });

  return getArticleById(id)!;
}

export function getArticleById(articleId: Article['id']): Article | undefined {
  return articles.find((article) => article.id === articleId);
}

export function getArticlesByPage(page: number): Article[] {
  const start = page * 10;
  const end = start + 10;

  return articles.slice(start, end);
}

export function getArticlesLength(): number {
  return articles.length;
}
