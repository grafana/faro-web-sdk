import type { AuthRegisterPayload, AuthRegisterSuccessPayload } from '../../../../common';
import { addUser, getUserByEmail, getUserPublicFromUser } from '../../../db';
import { logger } from '../../../logger';
import { sendError, sendFormValidationError, sendSuccess, setAuthorizationToken, signToken } from '../../../utils';
import type { RequestHandler } from '../../../utils';

export const registerHandler: RequestHandler<{}, AuthRegisterSuccessPayload, AuthRegisterPayload, {}> = async (
  req,
  res
) => {
  try {
    const { name, email, password } = req.body;

    if (!name) {
      return sendFormValidationError(res, 'name', 'Field is required');
    }

    if (!email) {
      return sendFormValidationError(res, 'email', 'Field is required');
    }

    if (!password) {
      return sendFormValidationError(res, 'password', 'Field is required');
    }

    const userByEmailRaw = await getUserByEmail(email);

    if (userByEmailRaw) {
      return sendFormValidationError(res, 'email', 'Value is already taken');
    }

    const userRaw = await addUser(req.body);

    const user = await getUserPublicFromUser(userRaw);

    const token = signToken(user);

    setAuthorizationToken(res, token);

    sendSuccess(res, user, 201);
  } catch (err) {
    logger.error(err);

    sendError(res, err);
  }
};
