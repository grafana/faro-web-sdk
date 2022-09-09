import type { AuthGetAuthStatePayload, AuthGetAuthStateSuccessPayload } from '../../../../common';
import { sendError, sendSuccess } from '../../../utils';
import type { RequestHandler } from '../../../utils';

export const stateHandler: RequestHandler<{}, AuthGetAuthStateSuccessPayload, AuthGetAuthStatePayload, {}> = async (
  _req,
  res
) => {
  try {
    sendSuccess(res, res.locals.user, 201);
  } catch (err) {
    sendError(res, err);
  }
};
