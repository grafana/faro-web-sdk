import { removeAuthorizationToken, sendUnauthenticatedError, verifyToken } from '../utils';
import type { RequestHandler } from '../utils';

export const authMiddleware: RequestHandler = async (_req, res, next) => {
  try {
    const user = verifyToken(res.locals.token);

    if (!user) {
      removeAuthorizationToken(res);

      return sendUnauthenticatedError(res);
    }

    res.locals.user = user;

    next();
  } catch (err) {
    removeAuthorizationToken(res);

    sendUnauthenticatedError(res);
  }
};
