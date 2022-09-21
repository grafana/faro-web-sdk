import type { ArticleAddPayload, ArticleAddSuccessPayload } from '../../../../common';
import { addArticle, getArticlePublicFromArticle } from '../../../db';
import { logger } from '../../../logger';
import { sendError, sendFormValidationError, sendSuccess } from '../../../utils';
import type { RequestHandler } from '../../../utils';

export const addArticleHandler: RequestHandler<{}, ArticleAddSuccessPayload, ArticleAddPayload, {}> = async (
  req,
  res
) => {
  try {
    const { name, text } = req.body;

    if (!name) {
      return sendFormValidationError(res, 'name', 'Field is required');
    }

    if (!text) {
      return sendFormValidationError(res, 'text', 'Field is required');
    }

    const articleRaw = await addArticle({ name, text }, res.locals.user.id);
    const article = await getArticlePublicFromArticle(articleRaw);

    sendSuccess(res, article);
  } catch (err) {
    logger.error(err);

    sendError(res, err);
  }
};
