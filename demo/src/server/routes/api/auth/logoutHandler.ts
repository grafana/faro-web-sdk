import type { AuthLogoutPayload, AuthLogoutSuccessPayload } from '../../../../models';
import { removeAuthorizationToken, sendSuccess } from '../../../utils';
import type { RequestHandler } from '../../../utils';

export const logoutHandler: RequestHandler<{}, AuthLogoutSuccessPayload, AuthLogoutPayload, {}> = (_req, res) => {
  removeAuthorizationToken(res);

  sendSuccess(res, { success: true });
};
