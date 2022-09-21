import type { ArticlesGetPayload, ArticlesGetSuccessPayload } from '../../../../common';
import { getArticlesByPage, getArticlesLength, getArticlesPublicFromArticles } from '../../../db';
import { logger } from '../../../logger';
import { sendError, sendSuccess } from '../../../utils';
import type { RequestHandler } from '../../../utils';

export const getArticlesHandler: RequestHandler<{}, ArticlesGetSuccessPayload, {}, ArticlesGetPayload> = async (
  req,
  res
) => {
  try {
    const { page } = req.query;

    const pageParam = !page ? 0 : parseInt(req.query['page'], 10);

    const articlesRaw = await getArticlesByPage(pageParam);
    const articles = await getArticlesPublicFromArticles(articlesRaw);

    const totalSize = await getArticlesLength();

    sendSuccess(res, {
      items: articles,
      totalSize,
    });
  } catch (err) {
    logger.error(err);

    sendError(res, err);
  }
};
