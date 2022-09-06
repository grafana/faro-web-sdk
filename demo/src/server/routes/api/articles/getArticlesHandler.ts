import type { ArticlesGetPayload, ArticlesGetSuccessPayload } from '../../../../models';
import { getArticlePublicFromArticle, getArticlesByPage, getArticlesLength } from '../../../data';
import { sendError, sendSuccess } from '../../../utils';
import type { RequestHandler } from '../../../utils';

export const getArticlesHandler: RequestHandler<{}, ArticlesGetSuccessPayload, {}, ArticlesGetPayload> = async (
  req,
  res
) => {
  try {
    const { page } = req.query;

    const pageParam = !page ? 0 : parseInt(req.query['page'], 10);

    const articles = getArticlesByPage(pageParam);

    sendSuccess(res, {
      items: articles.map(getArticlePublicFromArticle),
      totalSize: getArticlesLength(),
    });
  } catch (err) {
    sendError(res, err);
  }
};
