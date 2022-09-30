import type { AuthLogoutPayload, AuthLogoutSuccessPayload } from '../../../../common';
import { logger } from '../../../logger';
import { removeAuthorizationToken, sendError, sendSuccess } from '../../../utils';
import type { RequestHandler } from '../../../utils';

export const logoutHandler: RequestHandler<{}, AuthLogoutSuccessPayload, AuthLogoutPayload, {}> = (_req, res) => {
  try {
    removeAuthorizationToken(res);

    sendSuccess(res, true);
  } catch (err) {
    logger.error(err);

    sendError(res, err);
  }
};
