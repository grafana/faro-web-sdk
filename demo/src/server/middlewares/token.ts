import { authorizationCookieName } from '../utils';
import type { RequestHandler } from '../utils';

export const tokenMiddleware: RequestHandler = async (req, res, next) => {
  res.locals.token = req.cookies[authorizationCookieName]?.split(' ')[1];

  next();
};
