import { compare } from 'bcrypt';

import type { AuthLoginPayload, AuthLoginSuccessPayload } from '../../../../common';
import { getUserByEmail, getUserPublicFromUser } from '../../../db';
import { logger } from '../../../logger';
import { sendError, sendFormValidationError, sendSuccess, setAuthorizationToken, signToken } from '../../../utils';
import type { RequestHandler } from '../../../utils';

export const loginHandler: RequestHandler<{}, AuthLoginSuccessPayload, AuthLoginPayload, {}> = async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email) {
      return sendFormValidationError(res, 'email', 'Field is required');
    }

    if (!password) {
      return sendFormValidationError(res, 'password', 'Field is required');
    }

    const userRaw = await getUserByEmail(email);

    if (!userRaw) {
      return sendFormValidationError(res, 'email', 'User does not exist', 401);
    }

    const passwordMatchResult = await compare(password, userRaw.password);

    if (!passwordMatchResult) {
      return sendFormValidationError(res, 'password', 'Password is incorrect', 401);
    }

    const user = await getUserPublicFromUser(userRaw);

    const token = signToken(user);

    setAuthorizationToken(res, token);

    sendSuccess(res, user, 201);
  } catch (err) {
    logger.error(err);

    sendError(res, err);
  }
};
