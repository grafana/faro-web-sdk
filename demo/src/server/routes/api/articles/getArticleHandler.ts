import type { ArticleGetPayload, ArticleGetSuccessPayload } from '../../../../common';
import { getArticleById, getArticlePublicFromArticle } from '../../../db';
import { logger } from '../../../logger';
import { sendError, sendSuccess } from '../../../utils';
import type { RequestHandler } from '../../../utils';

export const getArticleHandler: RequestHandler<ArticleGetPayload, ArticleGetSuccessPayload, {}, {}> = async (
  req,
  res
) => {
  try {
    const { id } = req.params;

    if (!id) {
      return sendError(res, 'Article not found', 404);
    }

    const articleRaw = await getArticleById(id);

    if (!articleRaw) {
      return sendError(res, 'Article not found', 404);
    }

    const article = await getArticlePublicFromArticle(articleRaw);

    sendSuccess(res, article);
  } catch (err) {
    logger.error(err);

    sendError(res, err);
  }
};
