import type { ArticleModel, SeedGetPayload, SeedGetSuccessPayload, UserModel } from '../../../../common';
import { addArticle, addComment, addUser, mocks } from '../../../db';
import { logger } from '../../../logger';
import { sendError, sendSuccess } from '../../../utils';
import type { RequestHandler } from '../../../utils';

export const seedHandler: RequestHandler<{}, SeedGetSuccessPayload, SeedGetPayload, {}> = async (_req, res) => {
  try {
    const users: UserModel[] = [];
    const articles: ArticleModel[] = [];

    for (let idx = 0; idx < mocks.users.length; idx++) {
      users.push(await addUser(mocks.users[idx]!));
    }

    for (let idx = 0; idx < mocks.articles.length; idx++) {
      const { user, ...articleInput } = mocks.articles[idx]!;

      articles.push(await addArticle(articleInput, users[user]!.id));
    }

    for (let idx = 0; idx < mocks.comments.length; idx++) {
      const { article, user, ...commentInput } = mocks.comments[idx]!;

      await addComment(commentInput, articles[article]!.id, users[user]!.id);
    }

    sendSuccess(res, true, 201);
  } catch (err) {
    logger.error(err);

    sendError(res, err);
  }
};
