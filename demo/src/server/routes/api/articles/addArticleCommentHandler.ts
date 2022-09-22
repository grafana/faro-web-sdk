import type { ArticleCommentAddPayload, ArticleCommentAddSuccessPayload } from '../../../../common';
import { addComment, getArticleById, getArticlePublicFromArticle } from '../../../db';
import { logger } from '../../../logger';
import { sendError, sendFormValidationError, sendSuccess } from '../../../utils';
import type { RequestHandler } from '../../../utils';

export const addArticleCommentHandler: RequestHandler<
  {},
  ArticleCommentAddSuccessPayload,
  ArticleCommentAddPayload,
  {}
> = async (req, res) => {
  try {
    const { text } = req.body;

    if (!text) {
      return sendFormValidationError(res, 'text', 'Field is required');
    }

    const articleId = (req.params as any).id;

    await addComment({ text }, articleId, res.locals.user.id);

    const articleRaw = await getArticleById(articleId)!;
    const article = await getArticlePublicFromArticle(articleRaw!);

    sendSuccess(res, article);
  } catch (err) {
    logger.error(err);

    sendError(res, err);
  }
};
