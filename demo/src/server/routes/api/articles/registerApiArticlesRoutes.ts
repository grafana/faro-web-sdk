import { Router } from 'express';
import type { Express } from 'express';

import { authMiddleware } from '../../../middlewares';

import { addArticleCommentHandler } from './addArticleCommentHandler';
import { addArticleHandler } from './addArticleHandler';
import { getArticleHandler } from './getArticleHandler';
import { getArticlesHandler } from './getArticlesHandler';

export function registerApiArticlesRoutes(apiRouter: Router, _app: Express): void {
  const articlesRouter = Router();

  articlesRouter.get('/', getArticlesHandler);
  articlesRouter.get('/:id', getArticleHandler);
  articlesRouter.post('/', addArticleHandler);
  articlesRouter.post('/:id/comment', addArticleCommentHandler);

  apiRouter.use('/articles', authMiddleware, articlesRouter);
}
