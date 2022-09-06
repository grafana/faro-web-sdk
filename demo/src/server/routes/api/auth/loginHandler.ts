import { compare } from 'bcrypt';

import type { AuthLoginPayload, AuthLoginSuccessPayload } from '../../../../models';
import { getUserByEmail, getUserPublicFromUser } from '../../../data';
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

    const user = getUserByEmail(email);

    if (!user) {
      return sendFormValidationError(res, 'email', 'User does not exist', 401);
    }

    const result = await compare(password, user.password);

    if (!result) {
      return sendFormValidationError(res, 'password', 'Password is incorrect', 401);
    }

    const userPublic = getUserPublicFromUser(user);

    const token = signToken(userPublic);

    setAuthorizationToken(res, token);

    sendSuccess(res, userPublic, 201);
  } catch (err) {
    sendError(res, err);
  }
};
