import { hash } from 'bcrypt';

import type { AuthRegisterPayload, AuthRegisterSuccessPayload } from '../../../../models';
import { addUser, getUserByEmail, getUserPublicFromUser } from '../../../data';
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

    const userByEmail = getUserByEmail(email);

    if (userByEmail) {
      return sendFormValidationError(res, 'email', 'Value is already taken');
    }

    const encodedPassword = await hash(password, 10);

    const user = addUser({ name, email, password: encodedPassword });

    const userPublic = getUserPublicFromUser(user);

    const token = signToken(userPublic);

    setAuthorizationToken(res, token);

    sendSuccess(res, userPublic, 201);
  } catch (err) {
    sendError(res, err);
  }
};
